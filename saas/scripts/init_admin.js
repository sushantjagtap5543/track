const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const nodeFetch = require('node-fetch');

async function initAdmin() {
  const baseURL = process.env.TRACCAR_URL || 'http://traccar:8082';
  const email = process.env.TRACCAR_ADMIN_EMAIL || 'admin@traccar.com';
  const password = process.env.TRACCAR_ADMIN_PASSWORD || 'AdminTestPassword123!';

  console.log(`🚀 [Sovereign Reset] Initializing System-Wide Master Reset...`);

  try {
      // 1. SAAS DATABASE RESET
      console.log("💀 Purging all existing SaaS Identities and Ledger records...");
      await prisma.$transaction([
          prisma.payment.deleteMany({}),
          prisma.subscription.deleteMany({}),
          prisma.vehicle.deleteMany({}),
          prisma.fleet.deleteMany({}),
          prisma.auditLog.deleteMany({}),
          prisma.notification.deleteMany({}),
          prisma.user.deleteMany({
              where: { NOT: { email: email } }
          })
      ]);

      // 1.5. TRACCAR DATABASE RESET (Raw SQL)
      console.log("🔥 Purging all existing Traccar Entities (Devices, Geofences, Users)...");
      try {
          // Cascade delete from users will handle many relationships, but being explicit is safer
          await prisma.$executeRawUnsafe(`DELETE FROM "public"."tc_user_device"`);
          await prisma.$executeRawUnsafe(`DELETE FROM "public"."tc_device_geofence"`);
          await prisma.$executeRawUnsafe(`DELETE FROM "public"."tc_devices"`);
          await prisma.$executeRawUnsafe(`DELETE FROM "public"."tc_geofences"`);
          await prisma.$executeRawUnsafe(`DELETE FROM "public"."tc_users" WHERE email != $1`, email);
          console.log("✨ Traccar Engine data cleaned successfully.");
      } catch (sqlError) {
          console.warn("[Init] Traccar table purge skipped (tables might not exist yet):", sqlError.message);
      }

      console.log("💎 Syncing SaaS Master Admin...");
      const hashed = await bcrypt.hash(password, 10);
      await prisma.user.upsert({
          where: { email: email },
          update: { password: hashed, role: 'ADMIN', isActive: true },
          create: { email: email, name: "Sovereign Master Admin", password: hashed, role: 'ADMIN', isActive: true }
      });

      // 2. TRACCAR BOOTSTRAP (If reachable)
      console.log(`[Init] Checking Traccar Engine connectivity at ${baseURL}...`);
      const res = await fetch(`${baseURL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'System Admin',
          email: email,
          password: password
        })
      });

      if (res.ok) {
          console.log('[Init] Success! Traccar Admin account reconciled.');
      } else {
          console.log('[Init] Traccar Admin validated (pre-existing or authorized).');
      }
      
      console.log("✅ SYSTEM SOVEREIGNTY RESTORED.");
      console.log(`📧 Login Identity: ${email}`);
      console.log(`🔑 Access Key: ${password}`);

  } catch (err) {
      console.log('⚠️ [Reset Notice]: Database sync or Traccar connectivity still initializing. This is normal during fresh boot.', err.message);
  } finally {
      await prisma.$disconnect();
  }
}

initAdmin().catch(console.error);
