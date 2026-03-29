const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Protection',
      description: 'Standard monthly billing per device',
      pricePerDevice: 199,
      billingCycle: 'MONTHLY',
    },
    {
      id: 'yearly',
      name: 'Yearly Protection',
      description: 'Annual billing with 2 months free',
      pricePerDevice: 1999,
      billingCycle: 'YEARLY',
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }

  console.log('✅ Default plans seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
