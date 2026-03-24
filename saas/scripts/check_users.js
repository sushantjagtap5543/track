const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      geosurepathUserId: true,
      isActive: true
    }
  });
  console.log('--- Registered Users in SaaS Database ---');
  console.dir(users, { depth: null });
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});