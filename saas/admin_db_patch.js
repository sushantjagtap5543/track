const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function run() {
  const email = 'admin@geosurepath.com';
  const hashed = await bcrypt.hash('admin123', 10);
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT id FROM public.tc_users WHERE email = '${email}'`);
    let tcId;
    
    if (res && res.length > 0) {
      tcId = res[0].id;
      await prisma.$executeRawUnsafe(`UPDATE public.tc_users SET hashedpassword = '${hashed}', salt = '', disabled = false, readonly = false, administrator = true WHERE id = ${tcId}`);
      console.log('Updated existing Traccar user:', tcId);
    } else {
      console.log('Traccar user not found in DB. Need to create it.');
      await prisma.$executeRawUnsafe(`INSERT INTO public.tc_users (name, email, hashedpassword, salt, administrator, readonly, disabled) VALUES ('Admin', '${email}', '${hashed}', '', true, false, false)`);
      const newRes = await prisma.$queryRawUnsafe(`SELECT id FROM public.tc_users WHERE email = '${email}'`);
      tcId = newRes[0].id;
      console.log('Inserted new Traccar user:', tcId);
    }
    
    // Ensure SaaS User exists and linked
    await prisma.user.upsert({
      where: { email },
      update: { password: hashed, role: 'ADMIN', geosurepathUserId: tcId, isActive: true },
      create: { email, name: 'GeoSurePath Administrator', password: hashed, role: 'ADMIN', geosurepathUserId: tcId, isActive: true }
    });
    console.log('SaaS user linked successfully to Traccar ID:', tcId);
    
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
