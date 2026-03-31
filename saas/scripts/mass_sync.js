const prisma = require('../src/lib/prisma');
const geosurepathService = require('../src/services/geosurepath');
const { logAction, AUDIT_ACTIONS } = require('../src/services/auditService');

async function massSync() {
    console.log('🔄 [MassSync] Starting bulk reconciliation...');
    try {
        const users = await prisma.user.findMany({
            where: { deletedAt: null, role: { in: ['CLIENT', 'MANAGER'] } },
            select: { id: true, email: true, name: true, isActive: true, geosurepathUserId: true }
        });

        console.log(`[MassSync] Found ${users.length} users to reconcile.`);

        const results = { total: users.length, synced: 0, failed: 0 };

        for (const user of users) {
            try {
                let gUserId = user.geosurepathUserId;
                
                if (!gUserId) {
                    const engineUser = await geosurepathService.getUserByEmail(user.email);
                    if (engineUser) {
                        gUserId = engineUser.id;
                        await prisma.user.update({ where: { id: user.id }, data: { geosurepathUserId: gUserId } });
                    }
                }

                if (gUserId) {
                    await geosurepathService.updateUser(gUserId, { name: user.name, disabled: !user.isActive });
                } else {
                    const newGUser = await geosurepathService.createUser(user.name, user.email, 'GSP_RECOVERY_123');
                    await prisma.user.update({ where: { id: user.id }, data: { geosurepathUserId: newGUser.id } });
                }
                results.synced++;
                process.stdout.write('.');
            } catch (err) {
                results.failed++;
                console.error(`\n❌ Failed: ${user.email} - ${err.message}`);
            }
        }

        console.log(`\n✨ [MassSync] Complete. Synced: ${results.synced}, Failed: ${results.failed}`);
        process.exit(0);
    } catch (error) {
        console.error('\n🚨 [MassSync] Fatal error:', error.message);
        process.exit(1);
    }
}

massSync();
