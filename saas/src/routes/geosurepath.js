// src/routes/geosurepath.js
// ✅ FIX 1: Use shared Prisma singleton instead of `new PrismaClient()`.
// ✅ FIX 2: The `/events` endpoint now compares `event.geofenceId` correctly.
//    The original code compared an integer geofenceId from the Traccar event against
//    `vehicle.geosurepathGeofenceId` which is also an integer — but without explicit
//    type coercion, this could fail silently if the event field came in as a string.
//    Added parseInt() to guarantee the comparison is int vs int.

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { alertQueue, notificationQueue } = require('../services/queue');
const { authenticateToken } = require('../middleware/authMiddleware');
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
      where: { geosurepathDeviceId: device.id },
      include: { user: true }
    });

    if (!vehicle) return res.sendStatus(200);

    let type = 'GENERIC';
    let message = `Alert for ${vehicle.name}: ${event.type}`;

    // ✅ FIX 2: Ensure integer comparison for geofenceId
    const vehicleGeofenceId = vehicle.geosurepathGeofenceId
      ? parseInt(vehicle.geosurepathGeofenceId)
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
    console.error('Error processing GeoSurePath event:', error);
    res.sendStatus(500);
  }
});

const geosurepathService = require('../services/geosurepath');

/**
 * ✅ SOVEREIGN PROXY (S99-PLATINUM): The Master Gateway to the Tracking Engine.
 * This upgrade ensures that all proxied traffic uses the SaaS Backend's Master Authority,
 * eliminating 401 redirect loops caused by client cookie expiration.
 */
const proxyAuthMiddleware = (req, res, next) => {
    const targetPath = req.params[0] || req.path.replace('/api/geosurepath', '');
    const publicPaths = ['/server', '/session', '/password'];
    const isPublic = publicPaths.some(p => targetPath === p || targetPath.startsWith(p + '?') || targetPath.startsWith(p + '/'));
    
    if (isPublic) {
        return next();
    }
    return authenticateToken(req, res, next);
};

router.all(/(.*)/, proxyAuthMiddleware, async (req, res) => {
    try {
        const targetPath = req.params[0] || req.path.replace('/api/geosurepath', '');
        
        // 1. Determine Scope & Authority
        const isSecure = process.env.SECURE_COOKIES === 'true';
        let useMasterAuthority = false;
        let queryParams = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');

        if (req.user) {
            useMasterAuthority = true;
            // ✅ AUTO-SCOPING: If the user is NOT an admin, enforce their specific ID in collection queries
            if (req.user.role !== 'ADMIN' && req.user.geosurepathUserId) {
                const collectivePaths = ['/devices', '/positions', '/geofences', '/groups', '/calendars', '/events'];
                if (collectivePaths.some(p => targetPath.startsWith(p))) {
                    queryParams.set('userId', req.user.geosurepathUserId);
                }
            }
        }

        const queryString = queryParams.toString();
        const targetUrl = `${process.env.GEOSUREPATH_URL}/api${targetPath}${queryString ? '?' + queryString : ''}`;

        // 2. Prepare Headers
        let headers = { ...req.headers };
        if (useMasterAuthority) {
            await geosurepathService.ensureSession();
            headers = { ...headers, ...geosurepathService.getAuthHeaders() };
        } else {
            // ✅ FIX: The client sends `Authorization: Bearer <saas_token>` natively now.
            // Traccar's engine chokes on this (throws 401) because it thinks it's an OpenID token.
            // We MUST strip the Authorization header if we are not injecting Master Authority.
            delete headers.authorization;
        }
        
        delete headers.host;
        delete headers.connection;
        // Strip client's own Traccar cookie to prevent shadowing the Master session
        delete headers.cookie; 
        if (geosurepathService.getAuthHeaders().Cookie) {
            headers['Cookie'] = geosurepathService.getAuthHeaders().Cookie;
        }

        if (req.body && Object.keys(req.body).length > 0) {
            headers['Content-Type'] = 'application/json';
        }

        // 3. Relay Request
        const proxyRes = await geosurepathService.fetchWithSessionRefresh(targetUrl, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
            redirect: 'manual'
        });

        // 4. Relay Response
        res.status(proxyRes.status);
        proxyRes.headers.forEach((val, key) => {
            const lowKey = key.toLowerCase();
            // Security: Strip Set-Cookie from Traccar to prevent leaking Master session to Client
            if (['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie'].includes(lowKey)) return;
            res.setHeader(key, val);
        });

        const data = Buffer.from(await proxyRes.arrayBuffer());
        res.send(data);

        if (proxyRes.status >= 400) {
            console.warn(`[Sovereign Proxy] ${req.method} ${targetUrl} -> ${proxyRes.status}`);
        }
    } catch (error) {
        console.error(`[Sovereign Proxy] Critical Relay Error:`, error.message);
        res.status(502).json({ error: 'Tracking Engine Gateway Error', details: error.message });
    }
});

module.exports = router;