const prisma = require('../src/lib/prisma');

async function diag() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, geosurepathUserId: true },
        });

        console.log('--- SaaS User Account Mapping ---');
        users.forEach(u => {
            console.log(`${u.email.padEnd(30)} | GID: ${String(u.geosurepathUserId).padEnd(10)} | ID: ${u.id}`);
        });

        const gids = users.filter(u => u.geosurepathUserId).map(u => u.geosurepathUserId);
        const uniqueGids = new Set(gids);
        if (gids.length !== uniqueGids.size) {
            console.log('\n🚨 Duplicate GIDs detected in current SaaS state!');
        }

        if (dups.length === 0) {
            console.log('✅ No duplicates found in SaaS DB.');
        } else {
            console.log('🚨 Duplicate GeoSurePath User IDs found:');
            console.log(JSON.stringify(dups, null, 2));
        }
        process.exit(0);
    } catch (err) {
        console.error('Fatal:', err.message);
        process.exit(1);
    }
}

diag();
