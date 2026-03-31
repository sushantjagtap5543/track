const gs = require('../src/services/geosurepath');

async function check() {
    try {
        console.log('🔍 Checking sushant@gmail.com in Traccar...');
        const user = await gs.getUserByEmail('sushant@gmail.com');
        console.log('✅ Result:', JSON.stringify(user, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

check();
