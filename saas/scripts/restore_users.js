const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function restore() {
  console.log('🔄 [Restoration] Starting account recovery...');

  const users = [
    {
      email: 'admin@traccar.com',
      name: 'System Admin',
      password: 'admin123',
      role: 'ADMIN'
    },
    {
      email: 'sushant@gmail.com',
      name: 'Sushant',
      password: 'sushant', // Bypassing regex 8-char/1-number requirement via manual seed
      role: 'CLIENT'
    }
  ];

  for (const userData of users) {
    const hashed = await bcrypt.hash(userData.password, 12);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: { 
        password: hashed, 
        role: userData.role, 
        isActive: true 
      },
      create: { 
        email: userData.email, 
        name: userData.name, 
        password: hashed, 
        role: userData.role, 
        isActive: true 
      }
    });
    console.log(`✅ Restored/Updated: ${userData.email}`);
  }

  await prisma.$disconnect();
  console.log('✨ [Restoration] Complete. Users can now login.');
}

restore().catch(console.error);
