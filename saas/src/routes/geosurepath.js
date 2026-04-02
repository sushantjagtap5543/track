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
const fetch = require('node-fetch');

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

/**
 * ✅ UNIVERSAL PROXY (S99): The Master Gateway to the Tracking Engine.
 * Intercepts all /api/ requests, applies Just-in-Time Hardlock checks,
 * and relays authorized traffic to the GeoSurePath Tracking Engine.
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
    // 1. Determine Target URL
    const targetPath = req.params[0] || req.path.replace('/api/geosurepath', '');
    const targetUrl = `${process.env.GEOSUREPATH_URL}/api${targetPath}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

    // 2. Prepare Headers (Relay Authorization & Cookies)
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    
    // Ensure the engine sees the correct Content-Type if present
    if (req.body && Object.keys(req.body).length > 0) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const proxyRes = await fetch(targetUrl, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
            redirect: 'manual'
        });

        // 3. Relay Status & Headers (including JSESSIONID)
        res.status(proxyRes.status);
        proxyRes.headers.forEach((val, key) => {
            if (['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) return;
            res.setHeader(key, val);
        });

        // 4. Relay Body
        const data = await proxyRes.buffer();
        res.send(data);

        console.log(`[Universal Proxy] ${req.method} ${targetUrl} -> ${proxyRes.status}`);
    } catch (error) {
        console.error(`[Universal Proxy] Failed to relay request to ${targetUrl}:`, error.message);
        res.status(502).json({ error: 'Tracking Engine Gateway Timeout or Error', details: error.message });
    }
});

module.exports = router;