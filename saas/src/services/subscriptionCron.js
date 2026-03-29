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

    // 1. Find all ACTIVE subscriptions that have expired
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now }
      },
      include: { user: true }
    });

    if (expiredSubscriptions.length === 0) {
      console.log('[Cron] No expired subscriptions found.');
      return;
    }

    console.log(`[Cron] Found ${expiredSubscriptions.length} expired subscriptions. Processing...`);

    for (const sub of expiredSubscriptions) {
      const user = sub.user;
      
      // Update subscription status in DB
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' }
      });

      // Check if user has any other ACTIVE subscriptions (e.g. overlapping plans)
      const otherActiveSub = await prisma.subscription.findFirst({
        where: {
          userId: sub.userId,
          status: 'ACTIVE',
          expiresAt: { gt: now }
        }
      });

      // Check if user has a VIP grace extension
      const hasGraceExtension = user.graceExtensionUntil && new Date(user.graceExtensionUntil) > now;

      if (!otherActiveSub && !hasGraceExtension) {
        console.log(`[Cron] Locking user ${user.email} - No active subscriptions or grace extensions found.`);
        
        // Disable user in SaaS (Auth Middleware uses this field)
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false }
        });

        // Disable user in Traccar Engine (Prevents real-time data access)
        if (user.geosurepathUserId) {
          await geosurepathService.updateUser(user.geosurepathUserId, { disabled: true })
            .then(() => console.log(`[Cron] Sync Success: User ${user.email} disabled in Traccar.`))
            .catch(err => console.error(`[Cron] Sync Failed for ${user.email}:`, err.message));
        }

        // Audit Log for traceability
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'AUTO_EXPIRY_LOCK',
            details: `Account automatically locked due to subscription expiry (${sub.id}). Total device count: ${sub.deviceCount}.`
          }
        }).catch(err => console.error('[Cron] Audit log failed:', err.message));

      } else {
        console.log(`[Cron] User ${user.email} remains active (Other sub: ${!!otherActiveSub}, Grace: ${!!hasGraceExtension})`);
      }
    }
  } catch (err) {
    console.error('[Cron] Critical error in checkExpirations:', err);
  }
};

module.exports = { startSubscriptionCron, checkExpirations };
