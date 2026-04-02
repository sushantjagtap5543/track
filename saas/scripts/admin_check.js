const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAdmin() {
    try {
        const u = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { email: true } });
        console.log("-----------------------------------------");
        console.log("traccar IDENTITY DISCOVERY");
        console.log("ADMIN EMAIL: ", u?.email || "admin@traccar.com (DEFAULT)");
        console.log("ADMIN PWD  :  admin123 (DEFAULT)");
        console.log("TRACCAR    :  admin / admin (DEFAULT)");
        console.log("-----------------------------------------");
    } catch (e) {
        console.error("Discovery Failed:", e.message);
    } finally { process.exit(); }
}
findAdmin();
