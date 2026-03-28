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
    // Billing expiration checks have been migrated to aiGuardian.js for better grace-period management.
    // This worker remains available for future transactional jobs.
    if (job.name === 'process-payment') {
        console.log('[BillingWorker] Processing payment event...');
    }
  }, { connection: redisConnection }));

  // Expiration check is now handled exclusively by AI-Guardian every hour.
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