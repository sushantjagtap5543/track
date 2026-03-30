const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function sovereignReset() {
    console.log("🚀 INITIALIZING SOVEREIGN MASTER RESET...");
    const ADMIN_EMAIL = process.env.GEOSUREPATH_ADMIN_EMAIL || "admin@geosurepath.com";
    const ADMIN_PASS = process.env.GEOSUREPATH_ADMIN_PASSWORD || "admin123";

    try {
        console.log("💀 Purging all existing Client Identities and Ledger records...");
        
        // 1. SAAS DATABASE PURGE
        await prisma.$transaction([
            prisma.payment.deleteMany({}),
            prisma.subscription.deleteMany({}),
            prisma.vehicle.deleteMany({}),
            prisma.fleet.deleteMany({}),
            prisma.auditLog.deleteMany({}),
            prisma.notification.deleteMany({}),
            prisma.user.deleteMany({
                where: {
                    NOT: { email: ADMIN_EMAIL }
                }
            })
        ]);

        console.log("💎 Provisioning Sovereign Master Admin...");
        const hashed = await bcrypt.hash(ADMIN_PASS, 10);
        
        const masterAdmin = await prisma.user.upsert({
            where: { email: ADMIN_EMAIL },
            update: { 
                password: hashed, 
                role: 'ADMIN',
                status: 'ACTIVE'
            },
            create: { 
                email: ADMIN_EMAIL, 
                name: "Sovereign Master Admin", 
                password: hashed, 
                role: 'ADMIN',
                status: 'ACTIVE'
            }
        });

        console.log(`✅ SUCCESS: Master Admin Locked.`);
        console.log(`📧 User: ${ADMIN_EMAIL}`);
        console.log(`🔑 Key: ${ADMIN_PASS}`);
        console.log("\n⚠️ IMPORTANT: Please use these credentials to log in to the Billing portal.");

    } catch (err) {
        console.error("❌ SOVEREIGN RESET FAILED:", err.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

sovereignReset();
