const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function seedStressTest() {
    console.log("🚀 Initializing GeoSurePath Sovereign Stress Test (100 Clients)...");
    
    const hashedPassword = await bcrypt.hash("password123", 10);
    const now = new Date();
    
    // Cleanup previous stress test data if any
    // await prisma.user.deleteMany({ where: { role: 'CLIENT', email: { contains: 'stress_test_' } } });

    for (let i = 1; i <= 100; i++) {
        const userEmail = `client_${i}@geosurepath.test`;
        
        // Randomize registration stats
        // 30% PAID, 20% GRACE, 50% OVERDUE
        const rand = Math.random();
        let globalRegDate;
        if (rand < 0.3) {
            // PAID (Registration < 30 days ago)
            globalRegDate = new Date(now.getTime() - (Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000));
        } else if (rand < 0.5) {
            // GRACE (Overdue 1-7 days => Reg was 31-37 days ago)
            globalRegDate = new Date(now.getTime() - ((31 + Math.floor(Math.random() * 6)) * 24 * 60 * 60 * 1000));
        } else {
            // OVERDUE (Overdue 8+ days => Reg was 38+ days ago)
            globalRegDate = new Date(now.getTime() - ((40 + Math.floor(Math.random() * 100)) * 24 * 60 * 60 * 1000));
        }

        const user = await prisma.user.upsert({
            where: { email: userEmail },
            update: {},
            create: {
                email: userEmail,
                name: `Enterprise Client ${i}`,
                password: hashedPassword,
                role: 'CLIENT',
                registrationDate: globalRegDate
            }
        });

        // Create 2-3 Vehicles per user
        const vehicleCount = 2 + Math.floor(Math.random() * 2);
        for (let j = 1; j <= vehicleCount; j++) {
            const imei = `8654${String(i).padStart(3, '0')}${String(j).padStart(3, '0')}`;
            await prisma.vehicle.upsert({
                where: { imei },
                update: {},
                create: {
                    imei,
                    name: `Fleet Unit ${i}-${j}`,
                    userId: user.id,
                    registrationDate: globalRegDate // Align with user for testing
                }
            });
        }

        if (i % 10 === 0) console.log(`📦 Seeded ${i}/100 Clients...`);
    }

    console.log("✅ Sovereign Stress Test Data Initialized.");
    console.log("📊 Global User Ledger now contains 100 Enterprise Cohorts (~250 Vehicles).");
    process.exit(0);
}

seedStressTest();
