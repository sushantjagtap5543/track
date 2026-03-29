const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function masterReset() {
    console.log("🚀 INITIALIZING SOVEREIGN MASTER RESET...");
    const EMAIL = "admin@geosurepath.com";
    const PASS = "admin123";

    try {
        console.log("💀 Purging all existing Client Identities and Ledger records...");
        
        await prisma.$transaction([
            prisma.payment.deleteMany({}),
            prisma.subscription.deleteMany({}),
            prisma.vehicle.deleteMany({}),
            prisma.fleet.deleteMany({}),
            prisma.auditLog.deleteMany({}),
            prisma.notification.deleteMany({}),
            prisma.user.deleteMany({
                where: { NOT: { email: EMAIL } }
            })
        ]);

        console.log("💎 Syncing SaaS Master Admin...");
        const hashed = await bcrypt.hash(PASS, 10);
        await prisma.user.upsert({
            where: { email: EMAIL },
            update: { password: hashed, role: 'ADMIN', status: 'ACTIVE' },
            create: { email: EMAIL, name: "Sovereign Master Admin", password: hashed, role: 'ADMIN', status: 'ACTIVE' }
        });

        console.log(`✅ SUCCESS: Master Admin Locked. Login: admin@geosurepath.com / admin123`);
    } catch (err) {
        console.error("❌ Reset Failed:", err.message);
    } finally { 
        await prisma.$disconnect();
        process.exit(0); 
    }
}

masterReset();
