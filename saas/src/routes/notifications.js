// src/routes/notifications.js
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const socketService = require('../services/socketService');

// Webhook for Traccar Forwarding (Positions)
router.post('/webhook/position', async (req, res) => {
  const position = req.body;
  if (!position || !position.deviceId) return res.status(400).send();

  try {
    // 1. Find the vehicle in our DB to get the owner
    const vehicle = await prisma.vehicle.findUnique({
      where: { geosurepathDeviceId: position.deviceId },
      select: { id: true, userId: true }
    });

    if (vehicle) {
      // 2. Broadcast to user room and vehicle room
      socketService.emitToUser(vehicle.userId, 'position_update', position);
      socketService.emitToVehicleRoom(vehicle.id, 'position_update', position);
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
      where: { geosurepathDeviceId: event.deviceId },
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