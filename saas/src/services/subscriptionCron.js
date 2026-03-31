// saas/src/services/subscriptionCron.js
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const geosurepathService = require('./geosurepath');

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

    // 2. Automated Grace Period: Find all ACTIVE subscriptions that have JUST expired
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now }
      },
      include: { user: true }
    });

    if (expiredSubscriptions.length > 0) {
      console.log(`[Cron] Found ${expiredSubscriptions.length} subscriptions hitting expiry. Moving to GRACE period...`);
      for (const sub of expiredSubscriptions) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'GRACE' }
        });
        console.log(`[Cron] User ${sub.user.email} moved to GRACE period (3 days remaining).`);
      }
    }

    // 3. Final Expiry: Find subscriptions in GRACE that have exceeded the 3-day window
    // (We consider a subscription 'fully dead' if status is GRACE and expiresAt is older than 3 days)
    const graceLimit = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const deadSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'GRACE',
        expiresAt: { lt: graceLimit }
      },
      include: { user: true }
    });

    if (deadSubscriptions.length === 0 && expiredSubscriptions.length === 0) {
      console.log('[Cron] No state transitions required today.');
      return;
    }

    console.log(`[Cron] Processing ${deadSubscriptions.length} final terminations...`);

    for (const sub of deadSubscriptions) {
      const user = sub.user;
      
      // Mark as EXPIRED/TERMINATED
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' }
      });

      // Check if user has any other ACTIVE subscriptions
      const otherActiveSub = await prisma.subscription.findFirst({
        where: {
          userId: sub.userId,
          status: 'ACTIVE',
          expiresAt: { gt: now }
        }
      });

      const hasGraceExtension = user.graceExtensionUntil && new Date(user.graceExtensionUntil) > now;

      if (!otherActiveSub && !hasGraceExtension) {
        console.log(`[Cron] TERMINATING user ${user.email} - Grace period exhausted.`);
        
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false }
        });

        if (user.geosurepathUserId) {
          await geosurepathService.updateUser(user.geosurepathUserId, { disabled: true })
            .then(() => console.log(`[Cron] Sync Success: User ${user.email} disabled in Traccar.`))
            .catch(err => console.error(`[Cron] Sync Failed for ${user.email}:`, err.message));
        }

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'AUTO_EXPIRY_LOCK',
            details: `Account locked after 3-day grace period exhausted. Subscription: ${sub.id}.`
          }
        }).catch(err => console.debug('[Cron] Audit log suppressed:', err.message));

      } else {
        console.log(`[Cron] User ${user.email} remains active via secondary sub/extension.`);
      }
    }
  } catch (err) {
    console.error('[Cron] Critical error in checkExpirations:', err);
  }
};

module.exports = { startSubscriptionCron, checkExpirations };
