// src/services/traccar.js
const { TRACCAR_URL, TRACCAR_ADMIN_EMAIL, TRACCAR_ADMIN_PASSWORD } = process.env;

let sessionCookie = null;

/**
 * Basic headers for Traccar API
 * Includes Authorization for every request (as fallback) and Cookie if available.
 */
const getAuthHeaders = () => {
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${TRACCAR_ADMIN_EMAIL}:${TRACCAR_ADMIN_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json'
  };
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }
  return headers;
};

/**
 * Ensures we have a valid session with Traccar.
 * Traccar 6.x requires a session for POST/PUT/DELETE operations.
 */
const ensureSession = async () => {
    if (sessionCookie) return;
    
    console.log(`Establishing Traccar session for ${TRACCAR_ADMIN_EMAIL}...`);
    
    const params = new URLSearchParams();
    params.append('email', TRACCAR_ADMIN_EMAIL);
    params.append('password', TRACCAR_ADMIN_PASSWORD);

    const response = await fetch(`${TRACCAR_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Traccar session creation failed [${response.status}]:`, text);
        throw new Error(`Traccar session creation failed: ${response.status} ${text}`);
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        // Extract JSESSIONID
        sessionCookie = setCookie.split(';')[0];
        console.log('Traccar session established successfully.');
    }
};

/**
 * Creates a new user in Traccar
 * Note: Does not require ensureSession() to allow for the very first admin registration.
 */
const createUser = async (name, email, password) => {
  const response = await fetch(`${TRACCAR_URL}/api/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, email, password })
  });
  if (!response.ok) {
    const text = await response.text();
    console.error(`Traccar createUser failed [${response.status}]:`, text);
    throw new Error(`Traccar createUser failed: ${response.status} ${text}`);
  }
  return response.json();
};

/**
 * Creates a new device in Traccar
 */
const createDevice = async (name, uniqueId) => {
  await ensureSession();
  const response = await fetch(`${TRACCAR_URL}/api/devices`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, uniqueId })
  });
  if (!response.ok) {
    const text = await response.text();
    console.error(`Traccar createDevice failed [${response.status}]:`, text);
    throw new Error(`Traccar createDevice failed: ${response.status} ${text}`);
  }
  return response.json();
};

/**
 * Links a device to a user in Traccar
 */
const linkDeviceToUser = async (userId, deviceId) => {
  await ensureSession();
  const response = await fetch(`${TRACCAR_URL}/api/permissions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, deviceId })
  });
  if (!response.ok) {
    const text = await response.text();
    console.error(`Traccar linkDeviceToUser failed [${response.status}]:`, text);
    throw new Error(`Traccar linkDeviceToUser failed: ${response.status} ${text}`);
  }
  return response.ok;
};

/**
 * Fetches the latest position for a device
 */
const getLatestPosition = async (deviceId) => {
    await ensureSession();
    const response = await fetch(`${TRACCAR_URL}/api/positions?deviceId=${deviceId}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    const positions = await response.json();
    return positions.length > 0 ? positions[0] : null;
};

/**
 * Deletes a user from Traccar
 */
const deleteUser = async (userId) => {
    await ensureSession();
    const response = await fetch(`${TRACCAR_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
};

/**
 * Deletes a device from Traccar
 */
const deleteDevice = async (deviceId) => {
    await ensureSession();
    const response = await fetch(`${TRACCAR_URL}/api/devices/${deviceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
};

/**
 * Sends a command to a device in Traccar
 */
const sendCommand = async (deviceId, type, attributes = {}) => {
    await ensureSession();
    const response = await fetch(`${TRACCAR_URL}/api/commands/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ deviceId, type, attributes })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Traccar sendCommand failed: ${response.status} ${text}`);
    }
    return response.json();
};

/**
 * Creates a geofence in Traccar
 */
const createGeofence = async (name, area) => {
    await ensureSession();
    const response = await fetch(`${TRACCAR_URL}/api/geofences`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, area })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Traccar createGeofence failed: ${response.status} ${text}`);
    }
    return response.json();
};

/**
 * Links a geofence to a device
 */
const linkGeofenceToDevice = async (deviceId, geofenceId) => {
    await ensureSession();
    const response = await fetch(`${TRACCAR_URL}/api/permissions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ deviceId, geofenceId })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Traccar linkGeofenceToDevice failed: ${response.status} ${text}`);
    }
    return response.ok;
};

module.exports = {
  createUser,
  createDevice,
  linkDeviceToUser,
  getLatestPosition,
  deleteUser,
  deleteDevice,
  sendCommand,
  createGeofence,
  linkGeofenceToDevice
};
