// src/services/geosurepath.js
const { GEOSUREPATH_URL, GEOSUREPATH_ADMIN_EMAIL, GEOSUREPATH_ADMIN_PASSWORD } = process.env;

/**
 * Common hardware command mappings for different protocols.
 * This ensures that a generic action like 'engineStop' is translated
 * to the correct hardware-specific command for supported protocols.
 */
const PROTOCOL_COMMANDS = {
  'gt06': {
    'engineStop': { type: 'engineStop' },
    'engineResume': { type: 'engineResume' }
  },
  'teltonika': {
    'engineStop': { type: 'engineStop' },
    'engineResume': { type: 'engineResume' }
  },
  'gps103': {
    'engineStop': { type: 'engineStop' },
    'engineResume': { type: 'engineResume' }
  },
  'tk103': {
    'engineStop': { type: 'engineStop' },
    'engineResume': { type: 'engineResume' }
  },
  'h02': {
    'engineStop': { type: 'custom', attributes: { data: 'stop123456' } },
    'engineResume': { type: 'custom', attributes: { data: 'resume123456' } }
  }
};

let sessionCookie = null;

/**
 * Basic headers for GeoSurePath API
 * Includes Authorization for every request (as fallback) and Cookie if available.
 */
const getAuthHeaders = () => {
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${GEOSUREPATH_ADMIN_EMAIL}:${GEOSUREPATH_ADMIN_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json',
    'User-Agent': 'GeoSurePath-Sovereign-Guardian/1.0',
    'X-Sovereign-Source': 'SaaS-API'
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
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'GeoSurePath-Sovereign-Guardian/1.0',
            'X-Sovereign-Source': 'SaaS-API'
        },
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
  await ensureSession();
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
 * Gets the protocol of a device from its latest position
 */
const getDeviceProtocol = async (deviceId) => {
    const position = await getLatestPosition(deviceId);
    return position ? position.protocol : null;
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
 * Sends a command to a device in GeoSurePath with protocol-aware mapping
 */
const sendCommand = async (deviceId, action, attributes = {}) => {
    await ensureSession();

    // 1. Detect protocol
    const protocol = await getDeviceProtocol(deviceId);
    console.log(`Detected protocol for device ${deviceId}: ${protocol || 'unknown'}`);

    let commandType = action;
    let commandAttributes = { ...attributes };

    // 2. Map generic action to protocol-specific command
    if (protocol) {
        const protoKey = protocol.toLowerCase();
        if (PROTOCOL_COMMANDS[protoKey] && PROTOCOL_COMMANDS[protoKey][action]) {
            const mapping = PROTOCOL_COMMANDS[protoKey][action];
            commandType = mapping.type;
            commandAttributes = { ...commandAttributes, ...mapping.attributes };
            console.log(`Mapping action '${action}' to command '${commandType}' for protocol '${protocol}'`);
        }
    }

    const response = await fetch(`${GEOSUREPATH_URL}/api/commands/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ deviceId, type: commandType, attributes: commandAttributes })
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

/**
 * Deletes a geofence from GeoSurePath
 */
const deleteGeofence = async (geofenceId) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/geofences/${geofenceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
};

/**
 * Updates a user in GeoSurePath
 * @param {number} userId - The GeoSurePath user ID
 * @param {object} data - The data to update (e.g., { disabled: true })
 */
const updateUser = async (userId, data) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: userId, ...data })
    });
    if (!response.ok) {
        const text = await response.text();
        console.error(`GeoSurePath updateUser failed [${response.status}]:`, text);
        throw new Error(`GeoSurePath updateUser failed: ${response.status} ${text}`);
    }
    return response.json();
};

/**
 * Fetches all latest positions
 */
const getAllLatestPositions = async () => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/positions`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) return [];
    return response.json();
};

/**
 * Fetches all devices linked to a specific user in GeoSurePath
 */
const getUserDevices = async (userId) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/devices?userId=${userId}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        const text = await response.text();
        console.error(`GeoSurePath getUserDevices failed [${response.status}]:`, text);
        return [];
    }
    return response.json();
};

/**
 * Fetches all devices from GeoSurePath (Admin only)
 */
const getAllDevices = async () => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/devices`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) return [];
    return response.json();
};

/**
 * Fetches a specific user's details from GeoSurePath
 */
const getUser = async (userId) => {
    await ensureSession();
    const response = await fetch(`${GEOSUREPATH_URL}/api/users/${userId}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) {
        const text = await response.text();
        console.error(`GeoSurePath getUser failed [${response.status}]:`, text);
        return {};
    }
    return response.json();
};

module.exports = {
  createUser,
  getUser,
  updateUser,
  createDevice,
  linkDeviceToUser,
  getLatestPosition,
  deleteUser,
  deleteDevice,
  deleteGeofence,
  sendCommand,
  createGeofence,
  linkGeofenceToDevice,
  getAllLatestPositions,
  getUserDevices,
  getAllDevices
};