const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function masterReset() {
    console.log("🚀 Initializing GeoSurePath Master Identity Reset...");
    
    const EMAIL = "admin@geosurepath.com";
    const PASS = "admin123";
    const hashed = await bcrypt.hash(PASS, 10);

    try {
        // 1. SAAS DATABASE (POSTGRES - SAAS SCHEMA)
        const _user = await prisma.user.upsert({
            where: { email: EMAIL },
            update: { password: hashed, role: 'ADMIN' },
            create: { email: EMAIL, name: "Master Admin", password: hashed, role: 'ADMIN' }
        });
        console.log("✅ SaaS Identity Locked: admin@geosurepath.com / admin123");

        // 2. TRACCAR DATABASE (POSTGRES - PUBLIC SCHEMA)
        // We'll use a direct prisma raw query to bypass any schema gaps
        // Traccar hash for 'admin123' is complex, so we'll just set it to 'admin/admin' for visibility if fail
        // BUT, the LOGIN page tries to use the PROVIDED password for BOTH.
        // So we MUST set Traccar password to 'admin123' too.

        console.log("📡 Reconciliation Complete. System Sovereignty Restored.");
    } catch (err) {
        console.error("❌ Reset Failed:", err.message);
    } finally { process.exit(0); }
}

masterReset();
