require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');
const { startWorkers, redisConnection } = require('./src/services/queue');
const { startGuardian } = require('./src/services/aiGuardian');

const prisma = new PrismaClient();
const app = express();


// Start background services
startWorkers();
startGuardian();

// Security Hardening (Sovereign Shield)
app.use(helmet()); 
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
app.use(cors({ origin: allowedOrigins })); 
app.use(express.json());

// Main entry point
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GeoSurePath SaaS API is running.' });
});

// Master Heartbeat: Full Stack Diagnostic
app.get('/api/pulse', async (req, res) => {
  const status = {
    saas: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    geosurepath: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Database Check
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'connected';
  } catch (err) { status.database = `error: ${err.message}`; }

  try {
    // 2. Redis Check
    await redisConnection.ping();
    status.redis = 'connected';
  } catch (err) { status.redis = `error: ${err.message}`; }

  try {
    // 3. Engine Check (Sovereign Sync)
    const engineRes = await fetch(`${process.env.GEOSUREPATH_URL}/api/health`);
    status.geosurepath = engineRes.ok ? 'connected' : `status: ${engineRes.status}`;
  } catch (err) { status.geosurepath = `error: ${err.message}`; }

  const isHealthy = status.database === 'connected' && status.redis === 'connected' && status.geosurepath === 'connected';
  res.status(isHealthy ? 200 : 503).json(status);
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/vehicles', require('./src/routes/vehicles'));
app.use('/api/billing', require('./src/routes/billing'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/geosurepath', require('./src/routes/geosurepath'));
app.use('/api/notifications', require('./src/routes/notifications'));

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`[GeoSurePath] Server is running on port ${PORT}`);
});

const { stopWorkers } = require('./src/services/queue');

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n[GeoSurePath] Received ${signal}. Shutting down gracefully...`);
  
  // 1. Close HTTP Server
  server.close(async () => {
    // 2. Close Workers & Redis
    await stopWorkers();
    
    // 3. Close Database
    await prisma.$disconnect();
    
    console.log('[GeoSurePath] Cleanup complete. Process exiting.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));