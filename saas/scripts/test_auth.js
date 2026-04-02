const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function test() {
  const email = 'admin@traccar.com';
  console.log(`Diagnostic: Checking user ${email}...`);
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.error('❌ User not found in SaaS DB');
      process.exit(1);
    }
    
    console.log('✅ User found in SaaS DB');
    console.log(`User Role: ${user.role}`);
    console.log(`Is Active: ${user.isActive}`);
    console.log(`Traccar ID: ${user.traccarUserId || 'NONE'}`);
    
    const match = await bcrypt.compare('AdminTestPassword123!', user.password);
    if (match) {
      console.log('✅ Password match verified (bcrypt)');
    } else {
      console.error('❌ Password hash mismatch. Authentication will fail.');
    }
    
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
  }
  
  process.exit(0);
}

test();
