const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function hyperSync() {
    console.log("🚀 Initializing GeoSurePath Hyper-Sync Identity Matrix...");
    
    // TRACCAR CONFIG (Standard Admin Credentials Found)
    const TRACCAR_URL = "http://geosurepath:8082";
    const TRACCAR_MASTER_AUTH = { 
        'Authorization': 'Basic ' + Buffer.from('admin:admin').toString('base64'), 
        'Content-Type': 'application/json' 
    };

    const ADMIN_EMAIL = "admin@geosurepath.com";
    const ADMIN_PASS = "admin123";
    const CLIENT_PASS = "password123";

    try {
        // 1. Fetch All Users from Traccar
        console.log("📡 Fetching Traccar Cohorts...");
        const usersRes = await axios.get(`${TRACCAR_URL}/api/users`, { headers: TRACCAR_MASTER_AUTH });
        const traccarUsers = usersRes.data;

        for (const tu of traccarUsers) {
            const isTargetAdmin = tu.email === ADMIN_EMAIL || tu.administrator;
            const targetPass = isTargetAdmin ? ADMIN_PASS : CLIENT_PASS;
            
            console.log(`🔒 Synchronizing User: ${tu.email} -> [Locking Password]`);
            
            try {
                // UPDATE TRACCAR PASSWORD
                await axios.put(`${TRACCAR_URL}/api/users/${tu.id}`, {
                    ...tu,
                    password: targetPass
                }, { headers: TRACCAR_MASTER_AUTH });

                // UPDATE SAAS PASSWORD
                const saasHash = await bcrypt.hash(targetPass, 10);
                await prisma.user.upsert({
                    where: { email: tu.email },
                    update: { password: saasHash, role: isTargetAdmin ? 'ADMIN' : 'USER' },
                    create: { email: tu.email, name: tu.name || tu.email, password: saasHash, role: isTargetAdmin ? 'ADMIN' : 'USER' }
                });

            } catch (e) {
                console.warn(`⚠️ Failed to sync ${tu.email}: ${e.message}`);
            }
        }

        console.log("🏁 Hyper-Sync Complete. Sovereignty Restored.");
    } catch (err) {
        console.error("❌ Hyper-Sync Fatal Error:", err.message);
    } finally { process.exit(0); }
}

hyperSync();
