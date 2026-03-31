const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PLANS = [
    { id: 'monthly', name: 'Standard Monthly', days: 30, price: 200, billingCycle: 'MONTHLY', category: 'GENERAL' },
    { id: 'half_yearly', name: 'Safe Shield (6 Months)', days: 180, price: 1000, billingCycle: 'MONTHLY', category: 'GENERAL' },
    { id: 'yearly', name: 'Guardian Pro (1 Year)', days: 365, price: 2000, billingCycle: 'YEARLY', category: 'GENERAL' },
    { id: 'ais140_yearly', name: 'AIS 140 Government Compliance (1 Year)', days: 365, price: 3500, billingCycle: 'YEARLY', category: 'AIS140' }
];

async function seed() {
    console.log('--- Seeding Subscription Plans ---');
    for (const plan of PLANS) {
        await prisma.plan.upsert({
            where: { id: plan.id },
            update: {
                name: plan.name,
                pricePerDevice: plan.price,
                billingCycle: plan.billingCycle,
                category: plan.category
            },
            create: {
                id: plan.id,
                name: plan.name,
                pricePerDevice: plan.price,
                billingCycle: plan.billingCycle,
                category: plan.category
            }
        });
        console.log(`✅ Seeded plan: ${plan.name}`);
    }
    await prisma.$disconnect();
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
