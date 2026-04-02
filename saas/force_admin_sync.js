require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const traccarService = require('./src/services/traccar');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function forceSync() {
  const email = process.env.traccar_ADMIN_EMAIL || 'admin@traccar.com';
  const password = process.env.traccar_ADMIN_PASSWORD || 'admin123';
  console.log(`[FORCE SYNC] Starting full authentication sync for ${email}`);

  try {
    // 1. Ensure SaaS user exists
    let saasUser = await prisma.user.findUnique({ where: { email } });
    if (!saasUser) {
      console.log(`[FORCE SYNC] SaaS user missing. Creating...`);
      const hashed = await bcrypt.hash(password, 10);
      saasUser = await prisma.user.create({
        data: {
          email,
          password: hashed,
          name: 'Global Administrator',
          role: 'ADMIN',
          isActive: true
        }
      });
    } else {
      console.log(`[FORCE SYNC] SaaS user found (ID: ${saasUser.id}). Resetting password to ${password}`);
      const hashed = await bcrypt.hash(password, 10);
      saasUser = await prisma.user.update({
        where: { id: saasUser.id },
        data: { password: hashed, isActive: true, loginAttempts: 0, lockUntil: null }
      });
    }

    // 2. Clear tokens to invalidate bad sessions
    await prisma.refreshToken.deleteMany({ where: { userId: saasUser.id } });
    console.log(`[FORCE SYNC] Cleared stale active sessions for SaaS user.`);

    // 3. Find or Create Traccar User (with fallback for fresh installs)
    console.log(`[FORCE SYNC] Looking up user in Tracking Engine...`);
    let traccarUser;
    try {
        traccarUser = await traccarService.getUserByEmail(email);
    } catch (sessionErr) {
        if (sessionErr.message.includes('401')) {
            console.warn(`[FORCE SYNC] Auth failed with .env credentials. Attempting fallback to Traccar default (admin/admin)...`);
            try {
                const defaultSession = await traccarService.loginUser('admin', 'admin');
                if (defaultSession.cookie) {
                    console.log(`[FORCE SYNC] Default login successful. Proceeding as system admin...`);
                    traccarService.setSession(defaultSession.cookie);
                }
            } catch (defaultErr) {
                console.error(`[FORCE SYNC] Fallback failed: ${defaultErr.message}`);
                throw sessionErr; // Re-throw original 401
            }
        } else {
            throw sessionErr;
        }
    }

    if (traccarUser) {
      console.log(`[FORCE SYNC] Traccar user found (ID: ${traccarUser.id}). Force-updating password...`);
      await traccarService.updateUser(traccarUser.id, { password, administrator: true, disabled: false });
    } else {
      console.log(`[FORCE SYNC] Traccar user not found. Provisioning new master account...`);
      traccarUser = await traccarService.createUser('Global Administrator', email, password, { administrator: true });
    }

    // 4. Link the two systems
    await prisma.user.update({
      where: { id: saasUser.id },
      data: { traccarUserId: traccarUser.id }
    });

    console.log(`[FORCE SYNC] SUCCESS! Accounts linked. Traccar ID: ${traccarUser.id} <-> SaaS ID: ${saasUser.id}`);
  } catch (err) {
    console.error(`[FORCE SYNC] FATAL ERROR:`, err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

forceSync();
