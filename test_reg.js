async function testNoAuthRegistration() {
  const timestamp = Date.now();
  const url = 'http://3.108.114.12/api/auth/register'; // Note: This goes through SaaS API
  const payload = {
    name: 'Initial Admin',
    email: `admin${timestamp}@example.com`,
    password: 'password123',
    confirmPassword: 'password123',
    vehicleName: 'Admin Car',
    vehicleType: 'Car',
    vehicleModel: 'ADM-001',
    deviceImei: `8697270790${Math.floor(Math.random() * 90000 + 10000)}`
  };

  console.log('Attempting registration via SaaS API for:', payload.email);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.json());
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testNoAuthRegistration();
