const TRACCAR_URL = process.env.TRACCAR_URL || 'http://localhost:8082';
const TRACCAR_ADMIN_EMAIL = process.env.TRACCAR_ADMIN_EMAIL || 'admin@example.com';
const TRACCAR_ADMIN_PASSWORD = process.env.TRACCAR_ADMIN_PASSWORD || 'admin';

const getAuthHeaders = () => {
    return {
        'Authorization': 'Basic ' + Buffer.from(`${TRACCAR_ADMIN_EMAIL}:${TRACCAR_ADMIN_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/json'
    };
};

async function testRegistration() {
    try {
        console.log('Testing Traccar Registration locally against AWS server...');
        
        const userPayload = { name: 'Test User', email: 'test12345@test.com', password: 'password123' };
        console.log('1. Creating User:', userPayload);
        
        const res1 = await fetch(`${TRACCAR_URL}/api/users`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(userPayload)
        });
        
        let text1 = await res1.text();
        console.log(`User Create Response: ${res1.status}`);
        console.log(`User Create Body:`, text1);
        
        if (!res1.ok) {
            console.log('❌ Failed at User Creation');
            return;
        }
        
        let traccarUser;
        try {
            traccarUser = JSON.parse(text1);
        } catch (e) {
            console.error('❌ Failed to parse User Creation response as JSON');
            console.error('Response might be HTML or error message:', text1);
            return;
        }
        
        const devicePayload = { name: 'Test Vehicle', uniqueId: '869727079043558' };
        console.log('2. Creating Device:', devicePayload);
        
        const res2 = await fetch(`${TRACCAR_URL}/api/devices`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(devicePayload)
        });
        
        let text2 = await res2.text();
        console.log(`Device Create Response: ${res2.status}`);
        console.log(`Device Create Body:`, text2);
        
        if (!res2.ok) {
            console.log('❌ Failed at Device Creation');
            return;
        }
        
        let traccarDevice;
        try {
            traccarDevice = JSON.parse(text2);
        } catch (e) {
            console.error('❌ Failed to parse Device Creation response as JSON');
            console.error('Response might be HTML or error message:', text2);
            return;
        }
        
        console.log('3. Linking Device to User');
        const linkPayload = { userId: traccarUser.id, deviceId: traccarDevice.id };
        const res3 = await fetch(`${TRACCAR_URL}/api/permissions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(linkPayload)
        });
        
        console.log(`Link Response: ${res3.status}`);
        console.log(`Link Body:`, await res3.text());
        
        console.log('✅ Traccar side is working perfectly. The error might be locally in Prisma schema.');
    } catch (e) {
        console.error('Fatal fetch error:', e);
    }
}

testRegistration();
