const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@geosurepath.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('--- Database Reset Starting ---');

  try {
    // 1. Delete dependent data first (though most are Cascade, AuditLog is not)
    console.log('Cleaning Audit Logs...');
    await prisma.auditLog.deleteMany({});
    
    console.log('Cleaning Refresh Tokens...');
    await prisma.refreshToken.deleteMany({});

    // 2. Delete all other users
    console.log('Removing all existing users...');
    const deleteCount = await prisma.user.deleteMany({
      where: {
        NOT: {
          email: email
        }
      }
    });
    console.log(`Deleted ${deleteCount.count} users.`);

    // 3. Upsert requested admin
    console.log(`Setting up admin: ${email}`);
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        name: 'GeoSurePath Administrator'
      },
      create: {
        email,
        password: hashedPassword,
        name: 'GeoSurePath Administrator',
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('Admin setup complete:', admin.id);
    console.log('--- Database Reset Finished ---');
  } catch (error) {
    console.error('Error during reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
