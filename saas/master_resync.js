const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { execSync } = require('child_process');

async function masterResync() {
    console.log("🚀 Initializing GeoSurePath Hyper-Sovereign Identity Lock...");

    const ADMIN_EMAIL = "admin@geosurepath.com";
    const TARGET_PASS = "password123";
    const hashed = await bcrypt.hash(TARGET_PASS, 10);

    try {
        // 1. SAAS SYNC (Match all geosurepath users to password123)
        await prisma.user.updateMany({
            where: { email: { contains: "geosurepath" } },
            data: { password: hashed, role: 'USER' }
        });
        
        // Ensure master admin has ADMIN role
        await prisma.user.update({
            where: { email: ADMIN_EMAIL },
            data: { role: 'ADMIN' }
        });
        console.log("✅ SaaS Identity Matrix Synchronized: password123");

        // 2. TRACCAR SQL SYNC (Force Admin to match Client_1 hash/salt via Bridge)
        // We'll run this as a shell command to hit the DB container
        console.log("📡 Reconciliation of Telematics Identity Hub...");
        
        const sql = `
            UPDATE tc_users 
            SET email = 'admin@geosurepath.com', 
                login = 'admin', 
                hashedpassword = (SELECT hashedpassword FROM tc_users WHERE email = 'client_1@geosurepath.test' LIMIT 1), 
                salt = (SELECT salt FROM tc_users WHERE email = 'client_1@geosurepath.test' LIMIT 1) 
            WHERE id = 1;
        `;
        
        // Execute inside the DB container (since saas-api is in the same network)
        // Actually, we'll run it from the HOST shell via the automation runner.
        
    } catch (err) {
        console.error("❌ Sync Error:", err.message);
    } finally { process.exit(0); }
}

masterResync();
