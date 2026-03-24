// src/services/queue.js
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

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

// Initialize Workers
const startWorkers = () => {
  console.log('[GeoSurePath] Starting background workers...');

  const emailWorker = new Worker('EmailQueue', async job => {
    console.log(`[EmailWorker] Processing job ${job.id}: Sending email to ${job.data.to}`);
    // Nodemailer logic here
    // ...
  }, { connection: redisConnection });

  const alertWorker = new Worker('AlertQueue', async job => {
    console.log(`[AlertWorker] Processing alert: ${job.data.type} for device ${job.data.deviceId}`);
    // Alert rules logic (Geofence, Ignition, Safe Parking)
    // Send to WhatsApp / Email
    // ...
  }, { connection: redisConnection });

  const billingWorker = new Worker('BillingQueue', async job => {
    console.log(`[BillingWorker] Processing billing check for user ${job.data.userId}`);
    // Subscription suspension logic
    // ...
  }, { connection: redisConnection });

  // Event listeners for workers
  emailWorker.on('completed', job => console.log(`[EmailWorker] Job ${job.id} completed.`));
  emailWorker.on('failed', (job, err) => console.error(`[EmailWorker] Job ${job.id} failed:`, err));
};

module.exports = {
  emailQueue,
  alertQueue,
  billingQueue,
  startWorkers
};
