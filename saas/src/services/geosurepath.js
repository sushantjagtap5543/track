// src/services/geosurepath.js
const { GEOSUREPATH_URL, GEOSUREPATH_ADMIN_EMAIL, GEOSUREPATH_ADMIN_PASSWORD } = process.env;

let sessionCookie = null;

/**
 * Basic headers for GeoSurePath API
 * Includes Authorization for every request (as fallback) and Cookie if available.
 */
const getAuthHeaders = () => {
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${GEOSUREPATH_ADMIN_EMAIL}:${GEOSUREPATH_ADMIN_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json'
  };
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }
  return headers;
};

/**
 * Ensures we have a valid session with GeoSurePath.
 * GeoSurePath requirements: a session for POST/PUT/DELETE operations.
 */
const ensureSession = async () => {
    if (sessionCookie) return;
    
    console.log(`Establishing GeoSurePath session for ${GEOSUREPATH_ADMIN_EMAIL}...`);
    
    const params = new URLSearchParams();
    params.append('email', GEOSUREPATH_ADMIN_EMAIL);
    params.append('password', GEOSUREPATH_ADMIN_PASSWORD);

    const response = await fetch(`${GEOSUREPATH_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`GeoSurePath session creation failed [${response.status}]:`, text);
        throw new Error(`GeoSurePath session creation failed: ${response.status} ${text}`);
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        // Extract JSESSIONID
        sessionCookie = setCookie.split(';')[0];
        console.log('GeoSurePath session established successfully.');
    }
};

/**
 * Creates a new user in GeoSurePath
 */
const createUser = async (name, email, password) => {
  const response = await fetch(`${GEOSUREPATH_URL}/api/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, email, password })
  });
  if (!response.ok) {
    const text = await response.text();
    console.error(`GeoSurePath createUser failed [${response.status}]:`, text);
    throw new Error(`GeoSurePath createUser failed: ${response.status} ${text}`);
  }
  return response.json();
};

/**
 * Creates a new device in GeoSurePath
 */
const createDevice = async (name, uniqueId) => {
  await ensureSession();
  const response = await fetch(`${GEOSUREPATH_URL}/api/devices`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, uniqueId })
  });
  if (!response.ok) {
    const text = await response.text();
    console.error(`GeoSurePath createDevice failed [${response.status}]:`, text);
    throw new Error(`GeoSurePath createDevice failed: ${response.status} ${text}`);
  }
  return response.json();
};

/**
 * Links a device to a user in GeoSurePath
 */
const linkDeviceToUser = async (userId, deviceId) => {
  await ensureSession();
  const response = await fetch(`${GEOSUREPATH_URL}/api/permissions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, deviceId })
  });
  if (!response.ok) {
    const text = await response.text();
    console.error(`GeoSurePath linkDeviceToUser failed [${response.status}]:`, text);
    throw new Error(`GeoSurePath linkDeviceToUser failed: ${response.status} ${text}`);
  }
  return response.ok;
};

/**
 * Fetches the latest position for a device
 */
const getLatestPosition = async (deviceId) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/positions?deviceId=${deviceId}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    const positions = await response.json();
    return positions.length > 0 ? positions[0] : null;
};

/**
 * Deletes a user from GeoSurePath
 */
const deleteUser = async (userId) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
};

/**
 * Deletes a device from GeoSurePath
 */
const deleteDevice = async (deviceId) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/devices/${deviceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
};

/**
 * Sends a command to a device in GeoSurePath
 */
const sendCommand = async (deviceId, type, attributes = {}) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/commands/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ deviceId, type, attributes })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GeoSurePath sendCommand failed: ${response.status} ${text}`);
    }
    return response.json();
};

/**
 * Creates a geofence in GeoSurePath
 */
const createGeofence = async (name, area) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/geofences`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, area })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GeoSurePath createGeofence failed: ${response.status} ${text}`);
    }
    return response.json();
};

/**
 * Links a geofence to a device
 */
const linkGeofenceToDevice = async (deviceId, geofenceId) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/permissions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ deviceId, geofenceId })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`GeoSurePath linkGeofenceToDevice failed: ${response.status} ${text}`);
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
