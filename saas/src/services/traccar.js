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

module.exports = {
  createUser,
  createDevice,
  linkDeviceToUser
};
