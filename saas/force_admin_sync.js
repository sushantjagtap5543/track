const { PrismaClient } = require('@prisma/client');
const geosurepathService = require('./src/services/geosurepath');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function forceSync() {
  const email = 'admin@geosurepath.com';
  const password = 'admin123';
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

    // 3. Find or Create Traccar User
    console.log(`[FORCE SYNC] Looking up user in Tracking Engine...`);
    let traccarUser = await geosurepathService.getUserByEmail(email);

    if (traccarUser) {
      console.log(`[FORCE SYNC] Traccar user found (ID: ${traccarUser.id}). Force-updating password...`);
      await geosurepathService.updateUser(traccarUser.id, { password, administrator: true, disabled: false });
    } else {
      console.log(`[FORCE SYNC] Traccar user not found. Provisioning new master account...`);
      traccarUser = await geosurepathService.createUser('Global Administrator', email, password, { administrator: true });
    }

    // 4. Link the two systems
    await prisma.user.update({
      where: { id: saasUser.id },
      data: { geosurepathUserId: traccarUser.id }
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
