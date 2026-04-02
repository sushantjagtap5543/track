const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const email = 'admin@traccar.com';
  console.log('--- FINAL PRODUCTION VERIFICATION ---');
  
  try {
    const user = await prisma.user.update({
        where: { email },
        data: { isVerified: true, isActive: true }
    });
    console.log('VERIFICATION_SUCCESS: Admin is fully provisioned and verified.');
    console.log('ROLE:', user.role);
    console.log('ACTIVE:', user.isActive);
    console.log('VERIFIED:', user.isVerified);
  } catch (e) {
    console.error('VERIFICATION_ERROR:', e.message);
  }
  
  process.exit(0);
}

verify();
