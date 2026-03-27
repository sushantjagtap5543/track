const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const geosurepathService = require('./geosurepath');
const fcmService = require('./fcm');

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
  lazyConnect: true, // Don't crash on start
});

redisConnection.on('error', (err) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[GeoSurePath] Redis not available. Background jobs will be queued locally but not processed.');
  } else {
    console.error('[GeoSurePath] Redis error:', err);
  }
});

// Create queues
const emailQueue = new Queue('EmailQueue', { connection: redisConnection });
const alertQueue = new Queue('AlertQueue', { connection: redisConnection });
const billingQueue = new Queue('BillingQueue', { connection: redisConnection });
const notificationQueue = new Queue('NotificationQueue', { connection: redisConnection });

const emailService = require('./email');

const activeWorkers = [];

// Initialize Workers
const startWorkers = () => {
  console.log('[GeoSurePath] Starting background workers...');

  // 1. Email Worker
  activeWorkers.push(new Worker('EmailQueue', async job => {
    console.log(`[EmailWorker] Processing job ${job.id}: Sending email to ${job.data.to}`);
    const { to, subject, text, html } = job.data;
    try {
      await emailService.sendEmail({ to, subject, text, html });
    } catch (error) {
      console.error(`[EmailWorker] Failed for job ${job.id}:`, error.message);
      throw error;
    }
  }, { connection: redisConnection }));

  // 2. Alert Worker
  activeWorkers.push(new Worker('AlertQueue', async job => {
    if (job.name === 'check-stay-duration') {
        const { vehicleId, userId, durationMinutes } = job.data;
        try {
            const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
            if (!vehicle) return;
            const position = await geosurepathService.getLatestPosition(vehicle.geosurepathDeviceId);
            if (position && position.speed === 0) {
                await prisma.notification.create({
                    data: {
                        userId,
                        type: 'STAY_DURATION_ALERT',
                        message: `🚨 ALERT: ${vehicle.name} has been stopped for > ${durationMinutes} minutes.`
                    }
                });
            }
        } catch (error) { console.error('[AlertWorker] Error:', error); }
    }
  }, { connection: redisConnection }));

  // 3. Notification Worker (Push)
  activeWorkers.push(new Worker('NotificationQueue', async job => {
    const { userId, type, message, data } = job.data;
    try {
        await prisma.notification.create({ data: { userId, type, message } });
        await fcmService.sendToUser(userId, { title: `GeoSurePath: ${type}`, body: message, data });
    } catch (error) { console.error('[NotificationWorker] Error:', error); }
  }, { connection: redisConnection }));

  // 4. Billing Worker (Subscription Management & Retention)
  activeWorkers.push(new Worker('BillingQueue', async job => {
    if (job.name === 'check-expirations') {
        console.log('[BillingWorker] Scanning subscription status...');
        const now = new Date();
        const threeDaysOut = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

        // a. Warning (3 Days remaining)
        const expiringSoon = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lte: threeDaysOut, gt: now }
            },
            include: { user: true }
        });

        for (const sub of expiringSoon) {
            await emailService.sendEmail({
                to: sub.user.email,
                subject: '⚠️ Fleet Protection Warning: 3 Days Remaining',
                html: `<h3>GeoSurePath Fleet Warning</h3><p>Your plan expires in 3 days. Settle your dues to avoid lock.</p>`
            }).catch(e => console.error('Exp mail failed:', e.message));
        }

        // b. Hard Expiry (Pass Expiration)
        const expired = await prisma.subscription.findMany({
            where: { status: 'ACTIVE', expiresAt: { lt: now } },
            include: { user: true }
        });

        for (const sub of expired) {
            await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } });
            await prisma.user.update({ where: { id: sub.userId }, data: { isActive: false } });
            if (sub.user.geosurepathUserId) {
                await geosurepathService.updateUser(sub.user.geosurepathUserId, { disabled: true });
                console.log(`[BillingWorker] User ${sub.user.email} hard-locked.`);
            }
        }
    }
  }, { connection: redisConnection }));

  // Schedule periodic expiration check (Run every hour)
  billingQueue.add('check-expirations', {}, {
    repeat: { cron: '0 * * * *' },
    jobId: 'periodic-expiration-check'
  }).catch(e => console.error('[BillingWorker] Failed to schedule:', e));
};

const stopWorkers = async () => {
  console.log('[GeoSurePath] Closing background workers...');
  await Promise.all(activeWorkers.map(w => w.close()));
  await redisConnection.quit();
};

module.exports = {
  redisConnection,
  emailQueue,
  alertQueue,
  billingQueue,
  notificationQueue,
  startWorkers,
  stopWorkers
};