const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const axios = require('axios');

async function seedStressTest() {
    console.log("🚀 Initializing GeoSurePath Sovereign Stress Test (100 Clients)...");
    
    // Auth for Traccar API (Admin credentials)
    const TRACCAR_URL = "http://geosurepath:8082";
    const AUTH_HEADER = { 'Authorization': 'Basic ' + Buffer.from('admin:admin').toString('base64'), 'Content-Type': 'application/json' };

    const hashedPassword = await bcrypt.hash("password123", 10);
    const now = new Date();
    
    for (let i = 1; i <= 100; i++) {
        const userEmail = `client_${i}@geosurepath.test`;
        const userName = `Enterprise Client ${i}`;
        
        // --- 1. PROVISION IN SAAS (POSTGRES) ---
        const rand = Math.random();
        let globalRegDate;
        if (rand < 0.3) {
            globalRegDate = new Date(now.getTime() - (Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000));
        } else if (rand < 0.5) {
            globalRegDate = new Date(now.getTime() - ((32 + Math.floor(Math.random() * 5)) * 24 * 60 * 60 * 1000));
        } else {
            globalRegDate = new Date(now.getTime() - ((40 + Math.floor(Math.random() * 100)) * 24 * 60 * 60 * 1000));
        }

        const user = await prisma.user.upsert({
            where: { email: userEmail },
            update: {},
            create: {
                email: userEmail,
                name: userName,
                password: hashedPassword,
                role: 'CLIENT',
                registrationDate: globalRegDate
            }
        });

        // --- 2. PROVISION IN TRACCAR (H2/DB) ---
        try {
            const traccarUserRes = await axios.post(`${TRACCAR_URL}/api/users`, {
                name: userName,
                email: userEmail,
                password: "password123"
            }, { headers: AUTH_HEADER });
            const traccarUserId = traccarUserRes.data.id;

            // Link to SaaS
            await prisma.user.update({ where: { id: user.id }, data: { geosurepathUserId: traccarUserId } });

            // Provision 2-3 Vehicles
            const vehicleCount = 2 + (i % 2);
            for (let j = 1; j <= vehicleCount; j++) {
                const imei = `8654${String(i).padStart(3, '0')}${String(j).padStart(3, '0')}`;
                
                // Traccar Device
                const traccarDeviceRes = await axios.post(`${TRACCAR_URL}/api/devices`, {
                    name: `Fleet Unit ${i}-${j}`,
                    uniqueId: imei
                }, { headers: AUTH_HEADER });
                const traccarDeviceID = traccarDeviceRes.data.id;

                // SaaS Vehicle Record
                await prisma.vehicle.upsert({
                    where: { imei },
                    update: {},
                    create: {
                        imei,
                        name: `Fleet Unit ${i}-${j}`,
                        userId: user.id,
                        geosurepathDeviceId: traccarDeviceID,
                        registrationDate: globalRegDate
                    }
                });

                // Link User to Device in Traccar
                await axios.post(`${TRACCAR_URL}/api/permissions`, {
                    userId: traccarUserId,
                    deviceId: traccarDeviceID
                }, { headers: AUTH_HEADER });
            }
        } catch (_err) {
            // Already exists or network error
            console.warn(`⚠️ User/Device ${userEmail} might already exist in Traccar. Skipping provisioning.`);
        }

        if (i % 10 === 0) console.log(`📦 Seeded & Synced ${i}/100 Clients...`);
    }

    console.log("✅ Sovereign Stress Test Data Initialized and Dual-Synced.");
    process.exit(0);
}

seedStressTest();
