const fetch = require('node-fetch');

const API_URL = 'http://localhost/api'; // Through Nginx
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin';

const testSync = async () => {
    try {
        console.log('--- Starting Synchronization Verification ---');

        // 1. Admin Login
        const adminLogin = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        const { token: _adminToken } = await adminLogin.json();
        console.log('âœ“ Admin logged in');

        // 2. Identify a client to test with
        // For this test, we'll assume a client with ID exists or we'll try to find one.
        // Since we don't have a 'get clients' endpoint easily accessible here, 
        // let's assume we are testing with a known client email if possible.
        // In a real scenario, we'd create one.
        
        console.log('Note: This test requires a manual run or a known clientId.');
        console.log('To verify Suspension Sync:');
        console.log(`curl -X POST ${API_URL}/admin/client-status -H "Authorization: Bearer ADMIN_TOKEN" -d '{"clientId": "CLIENT_ID", "isActive": false}'`);
        console.log('Then verify in Traccar:');
        console.log(`curl -u admin@example.com:admin ${API_URL}/users/TRACCAR_USER_ID`);
        
        console.log('\nTo verify Password Sync:');
        console.log(`curl -X PUT ${API_URL}/auth/change-password -H "Authorization: Bearer CLIENT_TOKEN" -d '{"currentPassword": "old", "newPassword": "new"}'`);
        console.log('Then verify Traccar login with new password.');

    } catch (err) {
        console.error('Test failed:', err.message);
    }
};

testSync();