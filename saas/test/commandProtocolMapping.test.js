// saas/test/commandProtocolMapping.test.js

// Mock process.env BEFORE requiring the service
process.env.traccar_URL = 'http://mock-traccar';
process.env.traccar_ADMIN_EMAIL = 'admin@example.com';
process.env.traccar_ADMIN_PASSWORD = 'admin';

// Mock fetch
global.fetch = async (url, options) => {
    if (url.includes('/api/session')) {
        return {
            ok: true,
            headers: { get: () => 'JSESSIONID=test; Path=/' },
            json: async () => ({})
        };
    }
    
    if (url.includes('/api/positions')) {
        const searchParams = new URL(url).searchParams;
        const deviceId = searchParams.get('deviceId');
        let protocol = 'gt06';
        if (deviceId == '2') protocol = 'h02';
        if (deviceId == '3') protocol = 'unknown';
        
        return {
            ok: true,
            json: async () => [{ protocol }]
        };
    }
    
    if (url.includes('/api/commands/send')) {
        return {
            ok: true,
            json: async () => ({ success: true, sent: JSON.parse(options.body) })
        };
    }
    
    return { ok: false, status: 404, text: async () => 'Not Found' };
};

const traccarService = require('../src/services/traccar');

async function runTests() {
    console.log('--- TEST 1: gt06 (Built-in engineStop) ---');
    const res1 = await traccarService.sendCommand(1, 'engineStop');
    console.log('Sent Type:', res1.sent.type);
    console.log('Sent Attributes:', JSON.stringify(res1.sent.attributes));
    if (res1.sent.type === 'engineStop') {
        console.log('âœ… Passed');
    } else {
        console.log('âŒ Failed');
        process.exit(1);
    }

    console.log('\n--- TEST 2: h02 (Custom engineStop mapping) ---');
    const res2 = await traccarService.sendCommand(2, 'engineStop');
    console.log('Sent Type:', res2.sent.type);
    console.log('Sent Attributes:', JSON.stringify(res2.sent.attributes));
    if (res2.sent.type === 'custom' && res2.sent.attributes.data === 'stop123456') {
        console.log('âœ… Passed');
    } else {
        console.log('âŒ Failed');
        process.exit(1);
    }

    console.log('\n--- TEST 3: unknown protocol (Fallback to generic) ---');
    const res3 = await traccarService.sendCommand(3, 'engineStop');
    console.log('Sent Type:', res3.sent.type);
    console.log('Sent Attributes:', JSON.stringify(res3.sent.attributes));
    if (res3.sent.type === 'engineStop') {
        console.log('âœ… Passed');
    } else {
        console.log('âŒ Failed');
        process.exit(1);
    }
    
    console.log('\nAll tests passed successfully! ðŸš€');
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});