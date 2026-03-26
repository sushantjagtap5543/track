const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const axios = require('axios');

async function syncAdmin() {
    console.log("🚀 Initializing Sovereign Admin Sync (SaaS + Traccar)...");
    
    const ADMIN_EMAIL = "admin@geosurepath.com";
    const ADMIN_PASS = "admin123";
    const TRACCAR_URL = "http://geosurepath:8082";
    const TRACCAR_AUTH = { 'Authorization': 'Basic ' + Buffer.from('admin:admin').toString('base64'), 'Content-Type': 'application/json' };

    const hashed = await bcrypt.hash(ADMIN_PASS, 10);

    // 1. SAAS SYNC
    const saasAdmin = await prisma.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: { password: hashed, role: 'ADMIN' },
        create: { email: ADMIN_EMAIL, name: "Sovereign Administrator", password: hashed, role: 'ADMIN' }
    });
    console.log("✅ SaaS Admin Synced.");

    // 2. TRACCAR SYNC
    try {
        // Try to update existing 'admin' or create a new 'admin@geosurepath.com'
        // In Traccar, 'admin' is the default. We'll update its password to admin123
        const usersRes = await axios.get(`${TRACCAR_URL}/api/users`, { headers: TRACCAR_AUTH });
        const traccarAdmin = usersRes.data.find(u => u.administrator);
        
        if (traccarAdmin) {
            console.log(`📡 Found Traccar Admin ID: ${traccarAdmin.id}. Updating password to match SaaS...`);
            await axios.put(`${TRACCAR_URL}/api/users/${traccarAdmin.id}`, {
                ...traccarAdmin,
                email: ADMIN_EMAIL,
                password: ADMIN_PASS
            }, { headers: TRACCAR_AUTH });
            
            // Link SaaS to Traccar
            await prisma.user.update({ where: { id: saasAdmin.id }, data: { geosurepathUserId: traccarAdmin.id } });
            console.log("✅ Traccar Admin Unified.");
        }
    } catch (err) {
        console.error("❌ Traccar Admin Sync Failed:", err.message);
    }

    console.log("🏁 Sovereignty Reconciled.");
    process.exit(0);
}

syncAdmin();
