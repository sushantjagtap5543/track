async function initAdmin() {
  const baseURL = 'http://3.108.114.12';

  console.log('Attempting to create the first admin user (admin@geosurepath.com)...');
  const res = await fetch(`${baseURL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'System Admin',
      email: 'admin@geosurepath.com',
      password: 'admin123'
    })
  });

  const text = await res.text();
  if (res.ok) {
    console.log('Success! Admin created:', text);
  } else {
    console.log('Failed to create admin (maybe already exists?):', res.status, text);
    
    // Fallback: If it failed because we are not authorized, maybe the default admin/admin DOES exist.
    // Let's try to login as admin/admin and change it.
    console.log('Attempting fallback: changing admin/admin to admin@geosurepath.com...');
    const params = new URLSearchParams();
    params.append('email', 'admin');
    params.append('password', 'admin');

    const loginRes = await fetch(`${baseURL}/api/session`, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (loginRes.ok) {
      const cookie = loginRes.headers.get('set-cookie');
      const user = await loginRes.json();
      console.log('Logged in as admin/admin:', user);

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

      if (updateRes.ok) {
        console.log('Fallback Success: Changed default admin to admin@geosurepath.com');
      } else {
        console.log('Fallback Update Failed:', updateRes.status, await updateRes.text());
      }
    } else {
      console.log('Fallback Login Failed:', loginRes.status, await loginRes.text());
    }
  }
}

initAdmin().catch(console.error);
