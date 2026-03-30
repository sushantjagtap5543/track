// src/services/queue.js
// ✅ FIX 1: Use shared Prisma singleton instead of `new PrismaClient()`.
//    The old code created a new Prisma client at module load time AND the workers
//    ran in the same process, causing duplicate connection pools.
// ✅ FIX 2: BullMQ Workers now have individual error listeners attached so
//    unhandled worker errors don't bubble up and crash the Node.js process.
// ✅ FIX 3: Added `removeOnComplete` and `removeOnFail` job options to prevent
//    Redis from accumulating unlimited completed/failed job records over time.

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const prisma = require('../lib/prisma');
const geosurepathService = require('./geosurepath');
const fcmService = require('./fcm');
const emailService = require('./email');

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
  lazyConnect: true
});

redisConnection.on('error', (err) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[GeoSurePath] Redis not available. Background jobs will be queued locally but not processed.'
    );
  } else {
    console.error('[GeoSurePath] Redis error:', err.message);
  }
});

// ✅ FIX 3: Default job options — auto-clean completed/failed jobs from Redis
const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 200 },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000 // Retry starting at 5 seconds
  }
};

const emailQueue = new Queue('EmailQueue', {
  connection: redisConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS
});
const alertQueue = new Queue('AlertQueue', {
  connection: redisConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS
});
const billingQueue = new Queue('BillingQueue', {
  connection: redisConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS
});
const notificationQueue = new Queue('NotificationQueue', {
  connection: redisConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS
});

const activeWorkers = [];

// ✅ FIX 2: Helper to attach error listener so worker errors don't crash the process
const registerWorker = (worker, name) => {
  worker.on('failed', (job, err) => {
    console.error(`[${name}] Job ${job?.id} failed:`, err.message);
  });
  worker.on('error', (err) => {
    console.error(`[${name}] Worker error:`, err.message);
  });
  activeWorkers.push(worker);
  return worker;
};

const startWorkers = () => {
  console.log('[GeoSurePath] Starting background workers...');

  // 1. Email Worker
  registerWorker(
    new Worker(
      'EmailQueue',
      async (job) => {
        console.log(`[EmailWorker] Processing job ${job.id}: Sending email to ${job.data.to}`);
        const { to, subject, text, html } = job.data;
        await emailService.sendEmail({ to, subject, text, html });
      },
      { connection: redisConnection }
    ),
    'EmailWorker'
  );

  // 2. Alert Worker (Stay Duration checks)
  registerWorker(
    new Worker(
      'AlertQueue',
      async (job) => {
        if (job.name === 'check-stay-duration') {
          const { vehicleId, userId, durationMinutes } = job.data;
          const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
          if (!vehicle) return;

          const position = await geosurepathService.getLatestPosition(
            vehicle.geosurepathDeviceId
          );
          if (position && position.speed === 0) {
            await prisma.notification.create({
              data: {
                userId,
                type: 'STAY_DURATION_ALERT',
                message: `🚨 ALERT: ${vehicle.name} has been stopped for > ${durationMinutes} minutes.`
              }
            });
          }
        }
      },
      { connection: redisConnection }
    ),
    'AlertWorker'
  );

  // 3. Notification Worker (Push notifications)
  registerWorker(
    new Worker(
      'NotificationQueue',
      async (job) => {
        const { userId, type, message, data } = job.data;
        await prisma.notification.create({ data: { userId, type, message } });
        await fcmService.sendToUser(userId, {
          title: `GeoSurePath: ${type}`,
          body: message,
          data: data || {}
        });
      },
      { connection: redisConnection }
    ),
    'NotificationWorker'
  );

  // 4. Billing Worker (reserved for future transactional jobs)
  registerWorker(
    new Worker(
      'BillingQueue',
      async (job) => {
        if (job.name === 'process-payment') {
          console.log('[BillingWorker] Processing payment event...');
        }
      },
      { connection: redisConnection }
    ),
    'BillingWorker'
  );
};

const stopWorkers = async () => {
  console.log('[GeoSurePath] Closing background workers...');
  await Promise.all(activeWorkers.map((w) => w.close()));
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