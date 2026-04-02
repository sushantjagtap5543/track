// saas/src/services/subscriptionCron.js
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const traccarService = require('./traccar');

/**
 * Daily Subscription Expiry Check
 * Runs at 00:01 AM every day
 */
const startSubscriptionCron = () => {
  // ✅ REFINEMENT: Also run once immediately on startup to catch anything missed while server was down
  process.nextTick(() => {
    console.log('[Cron] Initializing startup subscription check...');
    checkExpirations();
  });

  cron.schedule('1 0 * * *', async () => {
    console.log('[Cron] Running scheduled daily subscription expiry check...');
    await checkExpirations();
  });
};

const checkExpirations = async () => {
  try {
    const now = new Date();

    // 1. Proactive Warning: Find subscriptions expiring in exactly 3 days
    const upcomingExpiries = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          gt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          lt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        }
      },
      include: { user: true }
    });

    for (const sub of upcomingExpiries) {
      console.log(`[Cron] [WARNING] Subscription for ${sub.user.email} expires in 3 days. Triggering notification flow...`);
      // Here usually we'd call an email service: await emailService.sendExpiryWarning(sub.user);
    }

    // 2 & 3. Automated Expiry & Grace Transitions (UNIFIED S98)
    const subscriptionsToProcess = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'GRACE'] },
        expiresAt: { lt: now } 
      },
      include: { user: true, plan: true }
    });

    if (subscriptionsToProcess.length === 0) {
      console.log('[Cron] No state transitions required today.');
      return;
    }

    const { getAccountHardlockState } = require('./billingService');

    for (const sub of subscriptionsToProcess) {
      const { isHardlocked, isGraceActive } = getAccountHardlockState(sub.user, sub);
      const user = sub.user;

      if (isGraceActive && sub.status === 'ACTIVE') {
        // Just expired -> Move to GRACE
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'GRACE' }
        });
        console.log(`[Cron] User ${user.email} moved to GRACE period.`);
      } else if (isHardlocked) {
        // Grace exhausted or immediately hardlocked
        console.log(`[Cron] TERMINATING user ${user.email} - Grace period exhausted.`);
        
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' }
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false }
        });

        if (user.traccarUserId) {
          await traccarService.updateUser(user.traccarUserId, { disabled: true })
            .then(() => console.log(`[Cron] Sync Success: User ${user.email} disabled in Traccar.`))
            .catch(err => console.error(`[Cron] Sync Failed for ${user.email}:`, err.message));
        }

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'AUTO_EXPIRY_LOCK',
            details: `Account locked after grace period exhausted. Subscription: ${sub.id}.`
          }
        }).catch(err => console.debug('[Cron] Audit log suppressed:', err.message));
      }
    }
  } catch (err) {
    console.error('[Cron] Critical error in checkExpirations:', err);
  }
};

module.exports = { startSubscriptionCron, checkExpirations };
