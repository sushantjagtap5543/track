const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'sushantjagtap.naandi@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { vehicles: true }
  });
  console.log('User found:', JSON.stringify(user, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
