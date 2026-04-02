async function test() {
  const email = 'admin@geosurepath.com';
  const pass = 'AdminTestPassword123!';
  const url = 'http://geosurepath:8082/api/session';
  
  console.log(`Testing Traccar Session for ${email}...`);
  
  const params = new URLSearchParams();
  params.append('email', email);
  params.append('password', pass);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body:', text);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
