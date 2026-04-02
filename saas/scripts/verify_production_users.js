const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('--- START VERIFICATION ---');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  try {
    const users = await prisma.user.findMany();
    console.log('USER_COUNT:', users.length);
    users.forEach(u => console.log(`- ${u.email} [${u.role}] (Active: ${u.isActive})`));
  } catch (e) {
    console.error('VERIFICATION_ERROR:', e.message);
  }
  
  process.exit(0);
}

verify();
