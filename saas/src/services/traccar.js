// src/services/traccar.js
const { TRACCAR_URL, TRACCAR_ADMIN_EMAIL, TRACCAR_ADMIN_PASSWORD } = process.env;

// Basic headers for Traccar API
const getAuthHeaders = (email = TRACCAR_ADMIN_EMAIL, password = TRACCAR_ADMIN_PASSWORD) => {
  return {
    'Authorization': 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64'),
    'Content-Type': 'application/json'
  };
};

/**
 * Creates a new user in Traccar
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} The created Traccar user
 */
const createUser = async (name, email, password) => {
  const response = await fetch(`${TRACCAR_URL}/api/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, email, password })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Traccar createUser failed: ${response.status} ${text}`);
  }
  return response.json();
};

/**
 * Creates a new device in Traccar
 * @param {string} name 
 * @param {string} uniqueId (IMEI)
 * @returns {Promise<Object>} The created Traccar device
 */
const createDevice = async (name, uniqueId) => {
  const response = await fetch(`${TRACCAR_URL}/api/devices`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, uniqueId })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Traccar createDevice failed: ${response.status} ${text}`);
  }
  return response.json();
};

/**
 * Links a device to a user in Traccar
 * @param {number} userId 
 * @param {number} deviceId 
 */
const linkDeviceToUser = async (userId, deviceId) => {
  const response = await fetch(`${TRACCAR_URL}/api/permissions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, deviceId })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Traccar linkDeviceToUser failed: ${response.status} ${text}`);
  }
  return response.ok;
};

/**
 * Fetches the latest position for a device from Traccar
 * @param {number} deviceId 
 * @returns {Promise<Object|null>} The latest position or null
 */
const getLatestPosition = async (deviceId) => {
    const response = await fetch(`${TRACCAR_URL}/api/positions?deviceId=${deviceId}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    const positions = await response.json();
    return positions.length > 0 ? positions[0] : null;
};

/**
 * Deletes a user from Traccar
 * @param {number} userId 
 */
const deleteUser = async (userId) => {
    const response = await fetch(`${TRACCAR_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
};

/**
 * Deletes a device from Traccar
 * @param {number} deviceId 
 */
const deleteDevice = async (deviceId) => {
    const response = await fetch(`${TRACCAR_URL}/api/devices/${deviceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
};

/**
 * Sends a command to a device in Traccar
 * @param {number} deviceId 
 * @param {string} type 
 * @param {Object} attributes 
 */
const sendCommand = async (deviceId, type, attributes = {}) => {
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
 * @param {string} name 
 * @param {string} area (WKT format)
 */
const createGeofence = async (name, area) => {
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
 * Deletes a geofence from Traccar
 * @param {number} geofenceId 
 */
const deleteGeofence = async (geofenceId) => {
    const response = await fetch(`${TRACCAR_URL}/api/geofences/${geofenceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.ok;
};

/**
 * Links a geofence to a device in Traccar
 * @param {number} deviceId 
 * @param {number} geofenceId 
 */
const linkGeofenceToDevice = async (deviceId, geofenceId) => {
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
  deleteGeofence,
  linkGeofenceToDevice
};
