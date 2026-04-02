const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Specify the public schema explicitly for Traccar tables
    const users = await prisma.$queryRawUnsafe('SELECT email, hashedpassword, salt FROM public.tc_users');
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
