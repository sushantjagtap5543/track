const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@geosurepath.com' }
  });
  console.log('USER_CHECK_RESULT:', JSON.stringify(user));
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
