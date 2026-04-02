const geosurepathService = require('./src/services/geosurepath');
require('dotenv').config();

async function test() {
    try {
        console.log('Testing createDevice via service layer...');
        const result = await geosurepathService.createDevice('Service-Test-Device-v2', 'SERV' + Date.now());
        console.log('Success:', result);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
