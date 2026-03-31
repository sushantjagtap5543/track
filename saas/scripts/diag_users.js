const prisma = require('../src/lib/prisma');

async function diag() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, geosurepathUserId: true },
            where: { geosurepathUserId: { not: null } }
        });

        const seen = new Map();
        const dups = [];

        for (const u of users) {
            if (seen.has(u.geosurepathUserId)) {
                dups.push({ gid: u.geosurepathUserId, user1: seen.get(u.geosurepathUserId), user2: u });
            } else {
                seen.set(u.geosurepathUserId, u);
            }
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
