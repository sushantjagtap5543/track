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

    // Prevention: Cannot stop engine while driving over 20km/h
    if (action === 'engineStop') {
      const position = await traccarService.getLatestPosition(vehicle.traccarDeviceId);
      if (position && position.speed > 20) {
        return res.status(400).json({ error: 'Cannot stop engine while driving over 20km/h for safety.' });
      }
    }

    // Send command to Traccar using the service
    await traccarService.sendCommand(vehicle.traccarDeviceId, action);

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
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: req.user.userId }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    let traccarGeofenceId = vehicle.traccarGeofenceId;

    if (enable) {
      // 1. Create Geofence in Traccar (Circle format)
      // Area format: CIRCLE (lat lng, radius_in_meters)
      const area = `CIRCLE (${lat} ${lng}, ${radius || 100})`;
      const geofence = await traccarService.createGeofence(`SafeParking_${vehicle.name}`, area);
      traccarGeofenceId = geofence.id;

      // 2. Link Geofence to Device in Traccar
      await traccarService.linkGeofenceToDevice(vehicle.traccarDeviceId, traccarGeofenceId);
    } else if (traccarGeofenceId) {
      // 3. Delete Geofence from Traccar if it exists
      await traccarService.deleteGeofence(traccarGeofenceId).catch(e => console.error('Failed to delete Traccar geofence:', e));
      traccarGeofenceId = null;
    }

    // 4. Update local DB
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        safeParkingOn: enable,
        parkingLat: enable ? lat : null,
        parkingLng: enable ? lng : null,
        parkingRadius: enable ? (radius || 100) : null,
        traccarGeofenceId: traccarGeofenceId
      }
    });

    res.json({ message: `Safe parking ${enable ? 'enabled' : 'disabled'} successfully` });
  } catch (error) {
    console.error('Safe parking error:', error);
    res.status(500).json({ error: 'Failed to update safe parking status', details: error.message });
  }
};
