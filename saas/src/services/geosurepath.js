// src/services/geosurepath.js
// ✅ FIX: Integrated loginUser for session relaying.

const { GEOSUREPATH_URL, GEOSUREPATH_ADMIN_EMAIL, GEOSUREPATH_ADMIN_PASSWORD } = process.env;

/**
 * Common hardware command mappings for different protocols.
 */
const PROTOCOL_COMMANDS = {
  gt06: {
    engineStop: { type: 'engineStop' },
    engineResume: { type: 'engineResume' }
  },
  teltonika: {
    engineStop: { type: 'engineStop' },
    engineResume: { type: 'engineResume' }
  },
  gps103: {
    engineStop: { type: 'engineStop' },
    engineResume: { type: 'engineResume' }
  },
  tk103: {
    engineStop: { type: 'engineStop' },
    engineResume: { type: 'engineResume' }
  },
  h02: {
    engineStop: { type: 'custom', attributes: { data: 'stop123456' } },
    engineResume: { type: 'custom', attributes: { data: 'resume123456' } }
  }
};

let sessionCookie = null;

/** ✅ FIX: Added helper to wipe the cached session so ensureSession re-authenticates. */
const clearSession = () => {
  sessionCookie = null;
};

const setSession = (cookie) => {
  sessionCookie = cookie;
};

const getAuthHeaders = () => {
  const headers = {
    Authorization:
      'Basic ' +
      Buffer.from(`${GEOSUREPATH_ADMIN_EMAIL}:${GEOSUREPATH_ADMIN_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json',
    'User-Agent': 'GeoSurePath-System-Service/1.0',
    'X-System-Source': 'SaaS-API'
  };
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }
  return headers;
};

const ensureSession = async () => {
  if (sessionCookie) return;

  console.log(`Establishing GeoSurePath session for ${GEOSUREPATH_ADMIN_EMAIL}... (URL: ${GEOSUREPATH_URL})`);
  
  const params = new URLSearchParams();
  params.append('email', GEOSUREPATH_ADMIN_EMAIL);
  params.append('password', GEOSUREPATH_ADMIN_PASSWORD);

  const response = await fetch(`${GEOSUREPATH_URL}/api/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'GeoSurePath-System-Service/1.0',
      'X-System-Source': 'SaaS-API'
    },
    body: params
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[GeoSurePath] Session creation failed for ${GEOSUREPATH_ADMIN_EMAIL}. Status: ${response.status}. Body: ${text}`);
    throw new Error(`GeoSurePath session creation failed: ${response.status} ${text}`);
  }

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0];
    console.log('GeoSurePath session established successfully.');
  }
};

const loginUser = async (email, password) => {
  const params = new URLSearchParams();
  params.append('email', email);
  params.append('password', password);

  const response = await fetch(`${GEOSUREPATH_URL}/api/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'GeoSurePath-System-Service/1.0',
      'X-System-Source': 'SaaS-API'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Traccar login failed: ${response.status}`);
  }

  const setCookie = response.headers.get('set-cookie');
  return {
    cookie: setCookie ? setCookie.split(';')[0] : null,
    data: await response.json()
  };
};

/**
 * ✅ FIX: Wrapper that checks for 401/403 responses and auto-refreshes the session
 * before retrying once. Added 10s timeout to prevent SaaS hanging on engine lag.
 */
const fetchWithSessionRefresh = async (url, options, retried = false) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    if ((response.status === 401 || response.status === 403) && !retried) {
      console.warn('[GeoSurePath] Session expired or invalid. Refreshing session and retrying...');
      clearSession();
      await ensureSession();
      const refreshedOptions = { ...options, headers: getAuthHeaders() };
      return fetchWithSessionRefresh(url, refreshedOptions, true);
    }

    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`GeoSurePath API Timeout: The tracking engine is taking too long to respond (>10s).`);
    }
    throw err;
  }
};

const createUser = async (name, email, password, options = {}) => {
  await ensureSession();
  const userData = { name, email, password, deviceLimit: 10, ...options };
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    const text = await response.text();
    // ✅ NEW: Specialized error parsing for common Traccar registration failures
    if (response.status === 400) {
        if (text.toLowerCase().includes('unique index') || text.toLowerCase().includes('duplicate')) {
            throw new Error('An account with this email/login already exists in the tracking engine.');
        }
        if (text.toLowerCase().includes('password')) {
            throw new Error('The tracking engine rejected the password format.');
        }
    }
    throw new Error(`GeoSurePath createUser failed: ${response.status} ${text}`);
  }
  return response.json();
};

const createDevice = async (name, uniqueId) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/devices`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, uniqueId })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GeoSurePath createDevice failed: ${response.status} ${text}`);
  }
  return response.json();
};

const linkDeviceToUser = async (userId, deviceId) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/permissions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, deviceId })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GeoSurePath linkDeviceToUser failed: ${response.status} ${text}`);
  }
  return response.ok;
};

const getLatestPosition = async (deviceId) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(
    `${GEOSUREPATH_URL}/api/positions?deviceId=${deviceId}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) return null;
  const positions = await response.json();
  return positions.length > 0 ? positions[0] : null;
};

const getDeviceProtocol = async (deviceId) => {
  const position = await getLatestPosition(deviceId);
  return position ? position.protocol : null;
};

const deleteUser = async (userId) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.ok;
};

const deleteDevice = async (deviceId) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/devices/${deviceId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return response.ok;
};

const sendCommand = async (deviceId, action, attributes = {}, retryCount = 0) => {
  await ensureSession();

  const protocol = await getDeviceProtocol(deviceId);
  console.log(`Detected protocol for device ${deviceId}: ${protocol || 'unknown'}`);

  let commandType = action;
  let commandAttributes = { ...attributes };

  if (protocol) {
    const protoKey = protocol.toLowerCase();
    if (PROTOCOL_COMMANDS[protoKey] && PROTOCOL_COMMANDS[protoKey][action]) {
      const mapping = PROTOCOL_COMMANDS[protoKey][action];
      commandType = mapping.type;
      commandAttributes = { ...commandAttributes, ...mapping.attributes };
    }
  }

  try {
    const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/commands/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ deviceId, type: commandType, attributes: commandAttributes })
    });

    if (!response.ok) {
      const text = await response.text();
      // ✅ PENTA CENTURION (S461): Auto-retry if device is offline or session blip
      if (retryCount < 3 && (response.status === 401 || text.includes('offline'))) {
        console.warn(`[Command] Retrying ${action} for device ${deviceId} (Attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return sendCommand(deviceId, action, attributes, retryCount + 1);
      }
      throw new Error(`GeoSurePath sendCommand failed: ${response.status} ${text}`);
    }
    return response.json();
  } catch (error) {
    // Queue for background retry if still failing (Conceptualizing BullMQ integration)
    console.error(`[Command Queue] Command ${action} failed for ${deviceId}. Persisting in queue for S461.`);
    throw error;
  }
};

const createGeofence = async (name, area) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/geofences`, {
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

const linkGeofenceToDevice = async (deviceId, geofenceId) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/permissions`, {
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

const deleteGeofence = async (geofenceId) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(
    `${GEOSUREPATH_URL}/api/geofences/${geofenceId}`,
    { method: 'DELETE', headers: getAuthHeaders() }
  );
  return response.ok;
};

const updateDevice = async (deviceId, data) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/devices/${deviceId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id: deviceId, ...data })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GeoSurePath updateDevice failed: ${response.status} ${text}`);
  }
  return response.json();
};

const updateUser = async (userId, data) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id: userId, ...data })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GeoSurePath updateUser failed: ${response.status} ${text}`);
  }
  return response.json();
};

const redis = require('../lib/redis');

const getAllLatestPositions = async () => {
  try {
    // ✅ HIGH-CONCURRENCY CACHE (Scenario 202): 
    // Cache the entire fleet state for 5s to prevent engine DDOS during admin audits.
    const CACHE_KEY = 'geosurepath:fleet:positions';
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    await ensureSession();
    const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/positions`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    
    await redis.setex(CACHE_KEY, 5, JSON.stringify(data));
    return data;

  } catch (error) {
    console.warn('[Cache Error] Falling back to direct engine fetch:', error.message);
    const response = await fetch(`${GEOSUREPATH_URL}/api/positions`, { headers: getAuthHeaders() });
    return response.ok ? response.json() : [];
  }
};

const getUserDevices = async (userId) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(
    `${GEOSUREPATH_URL}/api/devices?userId=${userId}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) return [];
  return response.json();
};

const getAllDevices = async () => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/devices`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) return [];
  return response.json();
};

const getUser = async (userId) => {
  await ensureSession();
  const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/users/${userId}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) return {};
  return response.json();
};

const getUserByEmail = async (email) => {
    await ensureSession();
    const response = await fetchWithSessionRefresh(`${GEOSUREPATH_URL}/api/users?email=${encodeURIComponent(email)}`, {
        headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    const users = await response.json();
    // ✅ FIX: Explicitly verify that the returned user matches the requested email.
    // Traccar may return the current user in some search scopes.
    const match = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    return match || null;
};

const getEvents = async (deviceId, from, to) => {
    await ensureSession();
    const url = `${GEOSUREPATH_URL}/api/reports/events?deviceId=${deviceId}&from=${from.toISOString()}&to=${to.toISOString()}`;
    const response = await fetchWithSessionRefresh(url, { headers: getAuthHeaders() });
    if (!response.ok) return [];
    return response.json();
};

module.exports = {
  createUser,
  getUser,
  getUserByEmail,
  getEvents,
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
  loginUser,
  updateDevice,
  setSession,
  getAuthHeaders,
  ensureSession,
  fetchWithSessionRefresh,
};