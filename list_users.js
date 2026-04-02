const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log('USERS_LIST:', JSON.stringify(users.map(u => ({ email: u.email, role: u.role, isActive: u.isActive }))));
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
