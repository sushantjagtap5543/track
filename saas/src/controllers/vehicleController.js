// src/controllers/vehicleController.js
const { PrismaClient } = require('@prisma/client');
const traccarService = require('../services/traccar');
const prisma = new PrismaClient();

// Get user's vehicles
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: req.user.userId }
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

// Toggle Engine (Ignition Control System)
exports.toggleEngine = async (req, res) => {
  const { vehicleId, action } = req.body; // action: 'engineResume' or 'engineStop'

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: req.user.userId }
    });

    if (!vehicle || !vehicle.traccarDeviceId) {
      return res.status(404).json({ error: 'Vehicle not found or not linked to device' });
    }

    // TODO: Need Traccar API service function to fetch latest position/speed
    // Prevent engine OFF if speed > threshold (e.g., 20 km/h)
    // if (action === 'engineStop') {
    //   const speed = await fetchCurrentSpeed(vehicle.traccarDeviceId);
    //   if (speed > 20) return res.status(400).json({error: 'Cannot stop engine while driving over 20km/h'});
    // }

    // Send command to Traccar
    // Endpoint: POST /api/commands/send
    // Body: { deviceId: vehicle.traccarDeviceId, type: action }
    const commandResponse = await fetch(`${process.env.TRACCAR_URL}/api/commands/send`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.TRACCAR_ADMIN_EMAIL}:${process.env.TRACCAR_ADMIN_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceId: vehicle.traccarDeviceId,
        type: action
      })
    });

    if (!commandResponse.ok) {
        throw new Error('Failed to send command to Traccar');
    }

    res.json({ message: `Engine command '${action}' sent successfully via Traccar` });
  } catch (error) {
    console.error('Engine control error:', error);
    res.status(500).json({ error: 'Failed to toggle engine', details: error.message });
  }
};

// Toggle Safe Parking
exports.toggleSafeParking = async (req, res) => {
  const { vehicleId, enable, lat, lng, radius } = req.body;

  try {
    const vehicle = await prisma.vehicle.updateMany({
      where: { id: vehicleId, userId: req.user.userId },
      data: {
        safeParkingOn: enable,
        parkingLat: enable ? lat : null,
        parkingLng: enable ? lng : null,
        parkingRadius: enable ? radius : null
      }
    });

    if (vehicle.count === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({ message: `Safe parking ${enable ? 'enabled' : 'disabled'} successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update safe parking status', details: error.message });
  }
};
