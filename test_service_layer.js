const geosurepathService = require('./saas/src/services/geosurepath');
require('dotenv').config({ path: './saas/.env' });

async function test() {
    try {
        console.log('Testing createDevice via service layer...');
        const result = await geosurepathService.createDevice('Service-Test-Device', 'SERV' + Date.now());
        console.log('Success:', result);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
