const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin';

const testAdmin = async () => {
  try {
    console.log('--- Testing Admin Panel ---');
    
    // 1. Login to get token
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    
    if (!loginRes.ok) {
      console.error('Admin Login Failed:', await loginRes.text());
      return;
    }
    
    const { token } = await loginRes.json();
    console.log('âœ“ Admin Login successful');
    
    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. Test Stats
    const statsRes = await fetch(`${API_URL}/admin/stats`, { headers });
    if (statsRes.ok) {
      console.log('âœ“ Admin Stats:', await statsRes.json());
    } else {
      console.error('âœ— Admin Stats Failed:', await statsRes.text());
    }

    // 3. Test Health
    const healthRes = await fetch(`${API_URL}/admin/health`, { headers });
    if (healthRes.ok) {
      console.log('âœ“ Admin Health:', await healthRes.json());
    } else {
      console.error('âœ— Admin Health Failed:', await healthRes.text());
    }

    // 4. Test Clients
    // Wait, let's see which route gets clients. Commonly /admin/clients.
    // In our adminController it was not explicitly shown in routes but let's assume.
    // Actually, I'll check routes/admin.js.
  } catch (err) {
    console.error('Error:', err.message);
  }
};

testAdmin();