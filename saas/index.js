// index.js (saas/index.js)
// ✅ FIX 1: Added startup environment variable validation. Missing critical vars
//    (DATABASE_URL, JWT_SECRET, GEOSUREPATH_URL) now cause a clear, immediate crash
//    with a descriptive message instead of silent failures deep in runtime.
// ✅ FIX 2: Added express-rate-limit on the /api/auth routes (Skip for now if not installed)
// ✅ FIX 3: Fixed graceful shutdown — moved all requires to the top to avoid race conditions.
// ✅ FIX 4: The CORS config `allowedOrigins = ['*']` is fixed to handle wildcard/specific origins.

require('dotenv').config();

// --- Environment Validation (FIX 1) ---
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'GEOSUREPATH_URL',
  'GEOSUREPATH_ADMIN_EMAIL',
  'GEOSUREPATH_ADMIN_PASSWORD'
];

const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    `[FATAL] Missing required environment variables:\n  ${missingVars.join('\n  ')}\n\nServer cannot start. Check your .env file.`
  );
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const socketService = require('./src/services/socketService');
const { fetchFreeModels } = require('./src/services/modelScheduler'); // Initialize weekly free model fetch
const cookieParser = require('cookie-parser');
// const xss = require('xss-clean');

const rateLimit = require('express-rate-limit');
const { startWorkers, stopWorkers, redisConnection } = require('./src/services/queue');
const { startGuardian } = require('./src/services/aiGuardian');
const { startSubscriptionCron } = require('./src/services/subscriptionCron');
const prisma = require('./src/lib/prisma');

const app = express();
app.set('trust proxy', 1); // Trust the first proxy (Nginx)

// --- Start background services ---
startWorkers();
startGuardian();
startSubscriptionCron();

// --- Security Middleware ---
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(helmet());
app.use(cookieParser());
// Removed xss-clean due to incompatibility with Express 5.x (req.query is read-only)


// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window (Relaxed from 100)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// Auth Rate Limiter (Stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window for auth (Relaxed from 20/hr)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again in an hour.' }
});

// ✅ FIX 4: Correct CORS configuration
const rawOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [];
const corsOptions = {
  origin:
    rawOrigins.length === 0 || rawOrigins.includes('*')
      ? '*'
      : (origin, callback) => {
          if (!origin || rawOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    const rawBody = buf.toString();
    console.log(`[DEBUG] Incoming Raw Request Body (Verify): [${rawBody}]`);
    // Check for weird characters
    for (let i = 0; i < rawBody.length; i++) {
        const char = rawBody[i];
        if (char.charCodeAt(0) < 32 || char.charCodeAt(0) > 126) {
            console.log(`[DEBUG] Hidden char at ${i}: hex ${char.charCodeAt(0).toString(16)}`);
        }
    }
  }
}));

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GeoSurePath SaaS API is running.' });
});

app.get('/api/pulse', async (req, res) => {
  const status = {
    saas: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    geosurepath: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'connected';
  } catch (err) {
    status.database = `error: ${err.message}`;
  }

  try {
    await redisConnection.ping();
    status.redis = 'connected';
  } catch (err) {
    status.redis = `error: ${err.message}`;
  }

  try {
    const engineRes = await fetch(`${process.env.GEOSUREPATH_URL}/api/health`);
    status.geosurepath = engineRes.ok ? 'connected' : `status: ${engineRes.status}`;
  } catch (err) {
    status.geosurepath = `error: ${err.message}`;
  }

  const isHealthy =
    status.database === 'connected' &&
    status.redis === 'connected' &&
    status.geosurepath === 'connected';

  res.status(isHealthy ? 200 : 503).json(status);
});

// --- Routes ---
// --- Routes ---
app.use('/api/auth', authLimiter, require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/user'));
app.use('/api/vehicles', require('./src/routes/vehicles'));
app.use('/api/billing', require('./src/routes/billing'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/geosurepath', require('./src/routes/geosurepath'));
app.use('/api/notifications', require('./src/routes/notifications'));

// --- Global Error Handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]', err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`[GeoSurePath] Server is running on port ${PORT}`);
});

// --- Socket.io Integration ---
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust for production
    methods: ['GET', 'POST']
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('token=')[1]?.split(';')[0];
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.user.userId;
  console.log(`[Socket] User connected: ${userId} (ID: ${socket.id})`);
  
  socket.join(`user:${userId}`);
  
  // Join vehicle rooms for vehicles owned by this user
  prisma.vehicle.findMany({ where: { userId, deletedAt: null }, select: { id: true } })
    .then(vehicles => {
      vehicles.forEach(v => socket.join(`vehicle:${v.id}`));
    });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${userId}`);
  });
});

socketService.init(io);

// --- Graceful Shutdown (FIX 3: all requires are now at the top) ---
const shutdown = async (signal) => {
  console.log(`\n[GeoSurePath] Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    try {
      await stopWorkers();
      await prisma.$disconnect();
      console.log('[GeoSurePath] Cleanup complete. Process exiting.');
    } catch (e) {
      console.error('[GeoSurePath] Error during shutdown:', e.message);
    } finally {
      process.exit(0);
    }
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error('[GeoSurePath] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[GeoSurePath] Uncaught Exception:', err.message);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('[GeoSurePath] Unhandled Rejection:', reason);
});