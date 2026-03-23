const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const geosurepathService = require('./geosurepath');

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null
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
    console.log(`[AlertWorker] Processing alert job ${job.name}: ${job.id}`);
    
    if (job.name === 'check-stay-duration') {
        const { vehicleId, geofenceId, userId, durationMinutes } = job.data;
        
        try {
            // 1. Fetch current position from GeoSurePath
            const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
            if (!vehicle) return;

            const position = await geosurepathService.getLatestPosition(vehicle.geosurepathDeviceId);
            
            // 2. Business Logic: Is it still stopped in the same area?
            // Note: Traccar's /api/positions might not show 'geofenceId' directly in the position object unless linked.
            // But we can check speed and if it's within the radius (or check if it's still in geofence via Traccar events).
            // Simplified: If speed is 0 and it's been 30 mins, we assume it's stayed there if no 'exit' occurred.
            
            if (position && position.speed === 0) {
                await prisma.notification.create({
                    data: {
                        userId: userId,
                        type: 'STAY_DURATION_ALERT',
                        message: `🚨 ALERT: ${vehicle.name} has been stopped for more than ${durationMinutes} minutes in the restricted area.`
                    }
                });
                console.log(`[AlertWorker] Stay-duration alert triggered for ${vehicle.name}`);
            }
        } catch (error) {
            console.error('[AlertWorker] Error processing stay-duration check:', error);
        }
    }
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
