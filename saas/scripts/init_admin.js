const { GEOSUREPATH_URL, GEOSUREPATH_ADMIN_EMAIL, GEOSUREPATH_ADMIN_PASSWORD } = process.env;

async function initAdmin() {
  const baseURL = GEOSUREPATH_URL || 'http://geosurepath:8082';
  const email = GEOSUREPATH_ADMIN_EMAIL || 'admin@geosurepath.com';
  const password = GEOSUREPATH_ADMIN_PASSWORD || 'admin123';

  console.log(`[Init] Attempting to bootstrap first Traccar admin user (${email})...`);
  
  try {
    const res = await fetch(`${baseURL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'System Admin',
        email: email,
        password: password
      })
    });

    if (res.ok) {
        console.log('[Init] Success! First admin created/validated.');
    } else {
        const text = await res.text();
        if (res.status === 400 || res.status === 401) {
             console.log('[Init] Admin creation failed (possibly already initialized or auth required). Skipping fallback. Reason:', text);
        } else {
             console.log('[Init] Admin creation failed. Status:', res.status, text);
        }
    }
  } catch (err) {
      console.log('[Init] Error trying to contact Traccar for initialization. This is normal if Traccar is still warming up, it will be retried on next startup.', err.message);
  }
}

initAdmin().catch(console.error);
