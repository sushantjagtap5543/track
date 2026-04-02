const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function seed() {
  const email = process.env.GEOSUREPATH_ADMIN_EMAIL || 'admin@geosurepath.com';
  const password = process.env.GEOSUREPATH_ADMIN_PASSWORD || 'AdminTestPassword123!';
  
  console.log(`Seeding Admin: ${email}`);
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      isActive: true,
      password: hashedPassword
    },
    create: {
      email,
      name: 'Master Admin',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true
    }
  });
  
  console.log('SEED_SUCCESS:', JSON.stringify(user));
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
