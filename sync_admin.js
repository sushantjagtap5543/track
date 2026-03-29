// Using global fetch

async function syncAdmin() {
  const baseURL = 'http://3.108.114.12';

  // 1. Login to Traccar (which is proxied on /api/)
  console.log('Logging in as default admin...');
  const params = new URLSearchParams();
  params.append('email', 'admin');
  params.append('password', 'admin');

  const loginRes = await fetch(`${baseURL}/api/session`, {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (!loginRes.ok) {
    const text = await loginRes.text();
    console.error('Failed to login. Maybe already updated?', loginRes.status, text);
    return;
  }

  const cookie = loginRes.headers.get('set-cookie');
  const user = await loginRes.json();
  console.log('Logged in as:', user);

  // 2. Update to admin@geosurepath.com / admin123
  console.log('Updating admin credentials...');
  const updateRes = await fetch(`${baseURL}/api/users/${user.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      id: user.id,
      name: 'admin',
      email: 'admin@geosurepath.com',
      password: 'admin123',
      administrator: true
    })
  });

  if (!updateRes.ok) {
    const text = await updateRes.text();
    console.error('Failed to update admin', updateRes.status, text);
    return;
  }

  console.log('Successfully synchronized Traccar admin credentials to match saas-api .env configuration!');
}

syncAdmin().catch(console.error);
