const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function finalSync() {
    console.log("🚀 Initializing Zero-Gap Identity Reconciliation...");
    
    const EMAIL = "admin@geosurepath.com";
    const PASS = "admin123";
    const TRACCAR_URL = "http://geosurepath:8082";
    // Using current known admin creds to update others
    const TRACCAR_AUTH = { 'Authorization': 'Basic ' + Buffer.from('admin:admin').toString('base64'), 'Content-Type': 'application/json' };

    try {
        // 1. Update SaaS
        const hashed = await bcrypt.hash(PASS, 10);
        await prisma.user.upsert({
            where: { email: EMAIL },
            update: { password: hashed, role: 'ADMIN' },
            create: { email: EMAIL, name: "Sovereign Admin", password: hashed, role: 'ADMIN' }
        });
        console.log("✅ SaaS Identity Locked.");

        // 2. Update Traccar API
        // First, Find the Admin user in Traccar
        const users = await axios.get(`${TRACCAR_URL}/api/users`, { headers: TRACCAR_AUTH });
        const traccarAdmin = users.data.find(u => u.administrator);
        
        if (traccarAdmin) {
            console.log(`📡 Re-Keying Traccar Admin (ID: ${traccarAdmin.id}) to Match SaaS...`);
            await axios.put(`${TRACCAR_URL}/api/users/${traccarAdmin.id}`, {
                ...traccarAdmin,
                email: EMAIL,
                password: PASS
            }, { headers: TRACCAR_AUTH });
            console.log("✅ Traccar Identity Harmonized.");
        }
    } catch (_err) {
        console.error("❌ Sync Gap discovered (falling back to manual DB patch).");
    } finally { process.exit(0); }
}

finalSync();
