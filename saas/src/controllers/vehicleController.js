// src/controllers/vehicleController.js
const { PrismaClient } = require('@prisma/client');
const geosurepathService = require('../services/geosurepath');
const prisma = new PrismaClient();

// Get user's vehicles
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: req.user.userId }
    });
    res.json(vehicles);
  } catch (_error) {
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

    if (!vehicle || !vehicle.geosurepathDeviceId) {
      return res.status(404).json({ error: 'Vehicle not found or not linked to device' });
    }

    // Prevention: Cannot stop engine while driving over 20km/h
    if (action === 'engineStop') {
      const position = await geosurepathService.getLatestPosition(vehicle.geosurepathDeviceId);
      if (position && position.speed > 20) {
        return res.status(400).json({ error: 'Cannot stop engine while driving over 20km/h for safety.' });
      }
    }

    // Send command to GeoSurePath using the service
    await geosurepathService.sendCommand(vehicle.geosurepathDeviceId, action);

    res.json({ message: `Engine command '${action}' sent successfully via GeoSurePath` });
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

    let geosurepathGeofenceId = vehicle.geosurepathGeofenceId;

    if (enable) {
      // 1. Create Geofence in GeoSurePath (Circle format)
      // Area format: CIRCLE (lat lng, radius_in_meters)
      const area = `CIRCLE (${lat} ${lng}, ${radius || 20})`;
      const geofence = await geosurepathService.createGeofence(`SafeParking_${vehicle.name}`, area);
      geosurepathGeofenceId = geofence.id;

      // 2. Link Geofence to Device in GeoSurePath
      await geosurepathService.linkGeofenceToDevice(vehicle.geosurepathDeviceId, geosurepathGeofenceId);
    } else if (geosurepathGeofenceId) {
      // 3. Delete Geofence from GeoSurePath if it exists
      await geosurepathService.deleteGeofence(geosurepathGeofenceId).catch(e => console.error('Failed to delete GeoSurePath geofence:', e));
      geosurepathGeofenceId = null;
    }

    // 4. Update local DB
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        safeParkingOn: enable,
        parkingLat: enable ? lat : null,
        parkingLng: enable ? lng : null,
        parkingRadius: enable ? (radius || 20) : null,
        geosurepathGeofenceId: geosurepathGeofenceId
      }
    });

    res.json({ message: `Safe parking ${enable ? 'enabled' : 'disabled'} successfully` });
  } catch (error) {
    console.error('Safe parking error:', error);
    res.status(500).json({ error: 'Failed to update safe parking status', details: error.message });
  }
};

// Create Custom Alert Rule
exports.createAlertRule = async (req, res) => {
  const { vehicleId, type, parameters } = req.body;

  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId: req.user.userId }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const alertRule = await prisma.alertRule.create({
      data: {
        vehicleId,
        type,
        parameters: parameters || {}
      }
    });

    res.json(alertRule);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
};

// Get Alert Rules for a vehicle
exports.getAlertRules = async (req, res) => {
  const { vehicleId } = req.params;

  try {
    const rules = await prisma.alertRule.findMany({
      where: { vehicleId, vehicle: { userId: req.user.userId } }
    });
    res.json(rules);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
};

// Delete Alert Rule
exports.deleteAlertRule = async (req, res) => {
  const { ruleId } = req.params;

  try {
    const rule = await prisma.alertRule.findFirst({
      where: { id: ruleId, vehicle: { userId: req.user.userId } }
    });

    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    await prisma.alertRule.delete({
      where: { id: ruleId }
    });

    res.json({ message: 'Alert rule deleted successfully' });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
};