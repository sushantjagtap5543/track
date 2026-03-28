// src/lib/prisma.js
// ✅ FIX: Single shared PrismaClient instance for the entire application.
// Having multiple `new PrismaClient()` scattered across files exhausts the
// PostgreSQL connection pool. This singleton is imported everywhere instead.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
});

module.exports = prisma;
