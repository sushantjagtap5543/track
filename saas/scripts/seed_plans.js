const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PLANS = [
    { id: 'monthly', name: 'Standard Monthly', days: 30, price: 200, billingCycle: 'MONTHLY' },
    { id: 'half_yearly', name: 'Safe Shield (6 Months)', days: 180, price: 1000, billingCycle: 'MONTHLY' },
    { id: 'yearly', name: 'Guardian Pro (1 Year)', days: 365, price: 2000, billingCycle: 'YEARLY' }
];

async function seed() {
    console.log('--- Seeding Subscription Plans ---');
    for (const plan of PLANS) {
        await prisma.plan.upsert({
            where: { id: plan.id },
            update: {
                name: plan.name,
                pricePerDevice: plan.price,
                billingCycle: plan.billingCycle
            },
            create: {
                id: plan.id,
                name: plan.name,
                pricePerDevice: plan.price,
                billingCycle: plan.billingCycle
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
