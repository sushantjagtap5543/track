require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const { TRACCAR_URL, TRACCAR_ADMIN_EMAIL, TRACCAR_ADMIN_PASSWORD } = process.env;

const getAuthHeaders = () => {
  return {
    'Authorization': 'Basic ' + Buffer.from(`${TRACCAR_ADMIN_EMAIL}:${TRACCAR_ADMIN_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json'
  };
};

async function clean() {
  console.log('🧹 Starting cleanup...');

  try {
    // 1. Fetch all Traccar Devices
    console.log('📡 Fetching Traccar devices...');
    let res = await fetch(`${TRACCAR_URL}/api/devices`, { headers: getAuthHeaders() });
    if (res.ok) {
      const devices = await res.json();
      for (const device of devices) {
        console.log(`Deleting device ${device.id}...`);
        await fetch(`${TRACCAR_URL}/api/devices/${device.id}`, { method: 'DELETE', headers: getAuthHeaders() });
      }
    }

    // 2. Fetch all Traccar Users
    console.log('👤 Fetching Traccar users...');
    res = await fetch(`${TRACCAR_URL}/api/users`, { headers: getAuthHeaders() });
    if (res.ok) {
      const users = await res.json();
      for (const user of users) {
        // DO NOT delete the admin user!
        if (user.email !== TRACCAR_ADMIN_EMAIL) {
          console.log(`Deleting user ${user.email} (ID: ${user.id})...`);
          await fetch(`${TRACCAR_URL}/api/users/${user.id}`, { method: 'DELETE', headers: getAuthHeaders() });
        }
      }
    }

    // 3. Delete Local Database Records
    console.log('🗄️ Cleaning local database (Prisma)...');
    await prisma.vehicle.deleteMany();
    await prisma.loginHistory.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.user.deleteMany({
      where: {
        role: { not: 'ADMIN' }
      }
    });

    console.log('✅ Cleanup complete! You can now register normally.');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clean();
