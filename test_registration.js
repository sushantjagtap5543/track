async function testRegistration() {
  const baseURL = 'http://3.108.114.12/api/auth/register';

  console.log('Testing SaaS API Registration...');
  const res = await fetch(baseURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Setup User',
      email: `testuser_${Date.now()}@example.com`,
      password: 'password123'
    })
  });

  const text = await res.text();
  console.log('Registration Status:', res.status);
  console.log('Registration Response:', text);
}

testRegistration().catch(console.error);
