const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function count() {
    const userCount = await prisma.user.count();
    const vehicleCount = await prisma.vehicle.count();
    console.log(`Users: ${userCount}, Vehicles: ${vehicleCount}`);
    await prisma.$disconnect();
}
count();
