// src/lib/prisma.js
// ✅ FIX: Single shared PrismaClient instance for the entire application.
// Having multiple `new PrismaClient()` scattered across files exhausts the
// PostgreSQL connection pool. This singleton is imported everywhere instead.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
  // ELITE HARDENING (Infra): Tuning connection pool for AWS Lightsail high-velocity scale
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'connection_limit=20&pool_timeout=30',
    },
  },
});

module.exports = prisma;
