const axios = require('axios');
const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration from Environment
const TRACCAR_URL = process.env.TRACCAR_URL || "http://3.108.114.12";
const ADMIN_USER = "sa@sa.com";
const ADMIN_PASS = "sa";
const AUTH = { 
    'Authorization': 'Basic ' + Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString('base64'), 
    'Content-Type': 'application/json' 
};

const TEST_USER_EMAIL = process.env.TRACCAR_ADMIN_EMAIL || "admin@traccar.com";
const SIM_IMEI = "GEOSIM_99999";
const SIM_NAME = "Test Simulator Alpha";

async function generateData() {
    console.log("🚀 Starting traccar Premium Data Seeding (1 Hour History)...");

    try {
        // 1. Get SaaS User
        const saasUser = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });
        if (!saasUser) throw new Error(`SaaS Admin (${TEST_USER_EMAIL}) not found. Run seed_test_users.js first.`);

        // 2. Create/Get Traccar Device
        console.log(`📡 Provisioning Traccar Device: ${SIM_NAME} (IMEI: ${SIM_IMEI})...`);
        let traccarDeviceID;
        try {
            const devRes = await axios.post(`${TRACCAR_URL}/api/devices`, { name: SIM_NAME, uniqueId: SIM_IMEI }, { headers: AUTH });
            traccarDeviceID = devRes.data.id;
            console.log(`✅ Created new device with ID: ${traccarDeviceID}`);
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log(`ℹ️ Device might already exist, fetching...`);
                const devices = await axios.get(`${TRACCAR_URL}/api/devices`, { headers: AUTH });
                const existing = devices.data.find(d => d.uniqueId === SIM_IMEI);
                if (existing) {
                    traccarDeviceID = existing.id;
                    console.log(`✅ Found existing device with ID: ${traccarDeviceID}`);
                } else {
                    throw new Error("Failed to create or find device: " + e.message, { cause: e });
                }
            } else {
                throw e;
            }
        }

        // 3. Create SaaS Vehicle Record
        console.log(`📦 Linking SaaS Vehicle...`);
        await prisma.vehicle.upsert({
            where: { imei: SIM_IMEI },
            update: { userId: saasUser.id, traccarDeviceId: traccarDeviceID },
            create: {
                name: SIM_NAME,
                imei: SIM_IMEI,
                userId: saasUser.id,
                traccarDeviceId: traccarDeviceID,
                registrationDate: new Date()
            }
        });

        // 4. Link User to Device in Traccar
        console.log(`🔗 Linking Traccar Permissions...`);
        try {
            if (saasUser.traccarUserId) {
                await axios.post(`${TRACCAR_URL}/api/permissions`, { 
                    userId: saasUser.traccarUserId, 
                    deviceId: traccarDeviceID 
                }, { headers: AUTH });
            }
        } catch (_e) {
            // Already linked
        }

        // 5. Generate GPS Data
        console.log(`📍 Injecting UTC-Synchronized Movement Data...`);
        const now = Date.now();
        const baseLat = 18.5204;
        const baseLon = 73.8567;
        const OSMAND_HOST = process.env.OSMAND_HOST || "3.108.114.12"; 

        for (let min = 0; min < 60; min++) {
            const timestamp = now - ((60 - min) * 60 * 1000);
            const lat = baseLat + (min * 0.0001);
            const lon = baseLon + (min * 0.0002);
            const speed = 40 + (min % 5);
            
            const path = `/?id=${SIM_IMEI}&lat=${lat}&lon=${lon}&speed=${speed}&timestamp=${timestamp}`;
            
            await new Promise((resolve) => {
                const req = http.request({ host: OSMAND_HOST, port: 5055, path, method: 'GET' }, (res) => {
                    res.on('data', () => {});
                    res.on('end', () => resolve());
                });
                req.on('error', (e) => {
                    console.error(`Error at min ${min}: ${e.message}`);
                    resolve();
                });
                req.end();
            });

            if (min % 15 === 0) process.stdout.write("▓");
        }

        console.log("\n✅ Mission Accomplished! 1 hour of motion history generated.");
        console.log(`🌐 Vehicle: ${SIM_NAME}`);
        console.log(`👤 Owner: ${TEST_USER_EMAIL}`);
        
    } catch (err) {
        console.error("❌ Fatal Seeding Error:", err.message);
        if (err.response) console.error("Response Data:", err.response.data);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

generateData();
