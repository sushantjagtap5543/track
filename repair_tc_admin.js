const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repair() {
  const email = process.env.GEOSUREPATH_ADMIN_EMAIL || 'admin@traccar.com';
  const password = process.env.GEOSUREPATH_ADMIN_PASSWORD || 'AdminTestPassword123!';
  const baseURL = process.env.GEOSUREPATH_URL || 'http://traccar:8082';

  console.log(`Starting Repair for ${email}...`);

  try {
    // 1. Delete corrupted user from TC
    console.log(`Deleting corrupted entry from tc_users for ${email}...`);
    await prisma.$executeRawUnsafe('DELETE FROM public.tc_users WHERE email = $1', email);
    
    // 2. Re-create via API so Traccar hashes it correctly
    console.log(`Re-creating user via Traccar API at ${baseURL}...`);
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
       console.log('✅ Master Admin successfully repaired and re-hashed by engine.');
    } else {
       const text = await res.text();
       console.error(`❌ Repair failed (API Error): ${res.status} ${text}`);
    }

  } catch (err) {
    console.error('❌ Repair failed (DB/Network):', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

repair();
