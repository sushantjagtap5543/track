// src/routes/traccar.js
// ✅ FIX 1: Use shared Prisma singleton instead of `new PrismaClient()`.
// ✅ FIX 2: The `/events` endpoint now compares `event.geofenceId` correctly.
//    The original code compared an integer geofenceId from the Traccar event against
//    `vehicle.traccarGeofenceId` which is also an integer — but without explicit
//    type coercion, this could fail silently if the event field came in as a string.
//    Added parseInt() to guarantee the comparison is int vs int.

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { alertQueue, notificationQueue } = require('../services/queue');
const { authenticateToken, authenticateTokenOptional } = require('../middleware/authMiddleware');
// Native Node fetch will be used

/**
 * Register or refresh an FCM device token for push notifications.
 */
router.post('/tokens', authenticateToken, async (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  try {
    await prisma.deviceToken.upsert({
      where: { token },
      update: { updatedAt: new Date() },
      create: {
        userId: req.user.userId,
        token,
        platform
      }
    });
    res.status(200).json({ status: 'ok', message: 'Token registered' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({ error: 'Failed to register token' });
  }
});

/**
 * Receive forwarded events from Traccar (geofence, alarm, etc.)
 * Traccar posts to this endpoint via its "Forward" integration setting.
 */
router.post('/events', async (req, res) => {
  const { event, device } = req.body;

  if (!event || !device) return res.sendStatus(200); // Silent success — keep Traccar happy

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { traccarDeviceId: device.id },
      include: { user: true }
    });

    if (!vehicle) return res.sendStatus(200);

    let type = 'GENERIC';
    let message = `Alert for ${vehicle.name}: ${event.type}`;

    // ✅ FIX 2: Ensure integer comparison for geofenceId
    const vehicleGeofenceId = vehicle.traccarGeofenceId
      ? parseInt(vehicle.traccarGeofenceId)
      : null;
    const eventGeofenceId = event.geofenceId ? parseInt(event.geofenceId) : null;

    const isSafeParkingBreach =
      event.type === 'geofenceExit' &&
      (event.attributes?.name?.startsWith('SafeParking') ||
        event.attributes?.name?.startsWith('Safe Parking') ||
        (vehicleGeofenceId !== null && eventGeofenceId === vehicleGeofenceId));

    if (isSafeParkingBreach) {
      type = 'SAFE_PARKING_BREACH';
      message = `SECURITY ALERT: ${vehicle.name} has moved out of its Safe Parking zone!`;
    }

    const isTampering =
      event.type === 'alarm' &&
      ['tampering', 'powerCut', 'vibration', 'door'].includes(event.attributes?.alarm);

    if (isTampering && !isSafeParkingBreach) {
      type = 'TAMPERING';
      message = `TAMPERING ALERT: Potential tampering detected on ${vehicle.name}! (${event.attributes.alarm})`;
    }

    await notificationQueue.add('send-notification', {
      userId: vehicle.userId,
      type,
      message,
      data: {
        vehicleId: vehicle.id,
        type,
        eventId: event.id?.toString()
      }
    });

    // Custom Alert Rules Processing (AREA_STAY)
    if (event.type === 'geofenceEnter') {
      const rules = await prisma.alertRule.findMany({
        where: { vehicleId: vehicle.id, type: 'AREA_STAY', isActive: true }
      });

      for (const rule of rules) {
        const params = rule.parameters;
        if (params.geofenceId && parseInt(params.geofenceId) === eventGeofenceId) {
          await alertQueue.add(
            'check-stay-duration',
            {
              userId: vehicle.userId,
              vehicleId: vehicle.id,
              geofenceId: eventGeofenceId,
              durationMinutes: params.durationMinutes || 30,
              ruleId: rule.id
            },
            { delay: (params.durationMinutes || 30) * 60 * 1000 }
          );
          console.log(
            `[AlertQueue] Queued stay-duration check for vehicle ${vehicle.name} in geofence ${eventGeofenceId}`
          );
        }
      }
    }

    console.log(`[Alert] Processed event ${event.type} for ${vehicle.user.email}`);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing Traccar event:', error);
    res.sendStatus(500);
  }
});

// Using shared middleware destructuring from top level
const traccarService = require('../services/traccar');

/**
 * ✅ SOVEREIGN PROXY (PLATINUM HARDENED): The Master Gateway to the Tracking Engine.
 * Resolves "Bad Request" by intelligently handling headers and rawBody buffers.
 */
const proxyAuthMiddleware = (req, res, next) => {
    const targetPath = req.params[0] || req.path.replace('/api/traccar', '');
    const explicitlyPublicPaths = ['/server', '/password', '/session'];
    const isExplicitlyPublic = explicitlyPublicPaths.some(p => targetPath === p || targetPath.startsWith(p + '?') || targetPath.startsWith(p + '/'));
    
    if (isExplicitlyPublic) {
        return next();
    }
    
    return authenticateToken(req, res, next);
};

router.all(/(.*)/, proxyAuthMiddleware, async (req, res) => {
    try {
        const targetPath = req.params[0] || req.path.replace('/api/traccar', '');
        
        // --- SECURE ROUTING OVERRIDE ---
        if (targetPath === '/session' && req.method === 'GET' && req.user) {
            return res.json({
                ...req.user,
                id: req.user.traccarUserId || req.user.userId,
                administrator: req.user.role === 'ADMIN',
                name: req.user.name || 'User',
                email: req.user.email || 'user@example.com'
            });
        }

        if (targetPath === '/devices' && req.method === 'POST') {
            const { name, uniqueId } = req.body;
            if (!name || !uniqueId) return res.status(400).json({ error: 'Name and uniqueId are required' });
            
            const device = await traccarService.createDevice(name, uniqueId);
            
            if (req.user.role !== 'ADMIN' && req.user.traccarUserId) {
                await traccarService.linkDeviceToUser(req.user.traccarUserId, device.id);
            }
            
            return res.status(200).json(device);
        }

        // 1. Determine Scope & Authority
        let useMasterAuthority = false;
        let queryParams = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');

        if (req.user) {
            useMasterAuthority = true;
            if (req.user.role !== 'ADMIN' && req.user.traccarUserId) {
                const collectivePaths = ['/devices', '/positions', '/geofences', '/groups', '/calendars', '/events'];
                if (collectivePaths.some(p => targetPath.startsWith(p))) {
                    queryParams.set('userId', req.user.traccarUserId);
                }
            }
        }

        const queryString = queryParams.toString();
        const targetUrl = `${process.env.TRACCAR_URL}/api${targetPath}${queryString ? '?' + queryString : ''}`;

        // 2. Prepare Clean Headers (PLATINUM HARDENING: Resolve "Bad Request")
        const relayHeaders = {};
        const headerWhitelist = [
            'accept', 'accept-language', 'user-agent', 'x-requested-with', 
            'content-range', 'range', 'if-match', 'if-none-match'
        ];
        
        headerWhitelist.forEach(h => {
            if (req.headers[h]) relayHeaders[h] = req.headers[h];
        });

        relayHeaders['accept'] = 'application/json';

        // 🟢 FIX: Only set Content-Type if we actually have a body to avoid "Bad Request" on empty-body POSTs
        const hasBody = !['GET', 'HEAD', 'DELETE'].includes(req.method) && 
                        ((req.body && Object.keys(req.body).length > 0) || req.rawBody);

        if (hasBody) {
            relayHeaders['content-type'] = req.headers['content-type'] || 'application/json';
        }

        // 3. Apply Master Authority
        if (useMasterAuthority) {
            await traccarService.ensureSession();
            Object.assign(relayHeaders, traccarService.getAuthHeaders());
        }

        // 4. Relay Request
        const fetchOptions = {
            method: req.method,
            headers: relayHeaders,
            redirect: 'manual'
        };

        if (hasBody) {
            fetchOptions.body = req.rawBody || JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);

        // 5. Build Response
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (!['content-encoding', 'transfer-encoding', 'content-length', 'connection', 'set-cookie'].includes(lowerKey)) {
                responseHeaders[key] = value;
            }
        });

        const data = Buffer.from(await response.arrayBuffer());
        res.set(responseHeaders);
        res.status(response.status).send(data);

        if (response.status >= 400 && process.env.NODE_ENV !== 'production') {
            console.warn(`[Traccar Proxy] ${req.method} ${targetUrl} -> ${response.status}`);
            console.warn(`[Traccar Proxy] Payload:`, data.toString().substring(0, 200));
        }
    } catch (err) {
        console.error('[Traccar Proxy] Failure:', err);
        res.status(502).json({ error: 'Tracking Engine Gateway Error', details: err.message });
    }
});

module.exports = router;