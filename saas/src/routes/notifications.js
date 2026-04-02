// src/routes/notifications.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const socketService = require('../services/socketService');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * GET /api/notifications/types
 * Returns a list of supported notification types for the frontend.
 */
router.get('/types', authenticateToken, async (req, res) => {
  const types = [
    { type: 'allEvents', title: 'All Events' },
    { type: 'deviceOnline', title: 'Device Online' },
    { type: 'deviceOffline', title: 'Device Offline' },
    { type: 'deviceMoving', title: 'Device Moving' },
    { type: 'deviceStopped', title: 'Device Stopped' },
    { type: 'ignitionOn', title: 'Ignition ON' },
    { type: 'ignitionOff', title: 'Ignition OFF' },
    { type: 'geofenceEnter', title: 'Geofence Enter' },
    { type: 'geofenceExit', title: 'Geofence Exit' },
    { type: 'overspeed', title: 'Overspeed' },
    { type: 'alarm', title: 'Alarms (SOS, Tampering, etc.)' },
    { type: 'fuelDrop', title: 'Fuel Drop' },
    { type: 'maintenance', title: 'Maintenance Required' }
  ];
  res.json(types);
});

/**
 * GET /api/notifications/
 * Returns a list of notifications for the authenticated user.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Webhook for Traccar Forwarding (Positions)
router.post('/webhook/position', async (req, res) => {
  const position = req.body;
  if (!position || !position.deviceId) return res.status(400).send();

  try {
    // 1. Find the vehicle in our DB to get the owner
    const vehicle = await prisma.vehicle.findUnique({
      where: { traccarDeviceId: position.deviceId },
      select: { id: true, userId: true }
    });

    if (vehicle) {
      // 2. Broadcast to user room and vehicle room
      socketService.emitToUser(vehicle.userId, 'position_update', position);
      socketService.emitToVehicleRoom(vehicle.id, 'position_update', position);

      // ✅ AIS 140: Government Port Forwarding (Platinum Feature)
      if (vehicle.isAIS140 && vehicle.forwardingEnabled && vehicle.governmentEndpoint) {
          // Asynchronous forwarding to avoid blocking internal tracking
          (async () => {
              try {
                  const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
                  const response = await fetch(vehicle.governmentEndpoint, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'X-AIS140-IMEI': position.attributes.uniqueId || 'UNKNOWN' },
                      body: JSON.stringify(position),
                      timeout: 5000 // 5s timeout to prevent hanging
                  });
                  
                  await prisma.vehicle.update({
                      where: { id: vehicle.id },
                      data: { 
                          lastForwardedAt: new Date(),
                          forwardingStatus: response.ok ? 'SUCCESS' : `FAILED (${response.status})`
                      }
                  });
              } catch (forwardError) {
                  console.error(`[AIS140-Forward] Failed for ${vehicle.id}:`, forwardError.message);
                  await prisma.vehicle.update({
                      where: { id: vehicle.id },
                      data: { forwardingStatus: `ERROR: ${forwardError.message.substring(0, 50)}` }
                  });
              }
          })();
      }
    }

    res.status(200).send();
  } catch (error) {
    console.error('[Webhook] Error processing position:', error.message);
    res.status(500).send();
  }
});

// Webhook for Traccar Forwarding (Events/Alerts)
router.post('/webhook/event', async (req, res) => {
  const event = req.body;
  if (!event || !event.deviceId) return res.status(400).send();

  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { traccarDeviceId: event.deviceId },
      select: { id: true, userId: true }
    });

    if (vehicle) {
      // Create local notification record
      await prisma.notification.create({
        data: {
          userId: vehicle.userId,
          type: event.type,
          message: `Alert from vehicle: ${event.type}`
        }
      });

      socketService.emitToUser(vehicle.userId, 'alert', event);
    }

    res.status(200).send();
  } catch (error) {
    console.error('[Webhook] Error processing event:', error.message);
    res.status(500).send();
  }
});

module.exports = router;