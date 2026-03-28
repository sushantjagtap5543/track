// src/controllers/vehicleController.js
const prisma = require('../lib/prisma');
const geosurepathService = require('../services/geosurepath');

// Helpers
const isValidIMEI = (imei) => /^\d{15}$/.test(imei);
const isValidCoords = (lat, lng) => 
  typeof lat === 'number' && typeof lng === 'number' && 
  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

exports.createVehicle = async (req, res) => {
  const { name, imei, type, model, plate, fleetId } = req.body;
  const userId = req.user.userId;

  if (!name || !imei) return res.status(400).json({ error: 'Vehicle name and IMEI are required.' });
  if (!isValidIMEI(imei)) return res.status(400).json({ error: 'Invalid IMEI format. Must be 15 digits.' });

  try {
    const existing = await prisma.vehicle.findUnique({ where: { imei } });
    if (existing) return res.status(400).json({ error: 'Vehicle with this IMEI already exists.' });

    const geosurepathDevice = await geosurepathService.createDevice(name, imei);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.geosurepathUserId) {
      await geosurepathService.linkDeviceToUser(user.geosurepathUserId, geosurepathDevice.id);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId, name, imei, type, model, plate, fleetId,
        geosurepathDeviceId: geosurepathDevice.id,
        registrationDate: new Date(),
        vehicleLogs: { create: { action: 'CREATED', details: 'Vehicle added to fleet' } }
      }
    });

    res.status(201).json({ message: 'Vehicle added successfully', vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vehicle', details: error.message });
  }
};

exports.getVehicles = async (req, res) => {
  const { page = 1, limit = 20, search = '', fleetId, type, isActive } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {
      userId: req.user.userId,
      deletedAt: null,
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { imei: { contains: search, mode: 'insensitive' } },
        { plate: { contains: search, mode: 'insensitive' } }
      ],
      ...(fleetId && { fleetId }),
      ...(type && { type }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const vehicles = await prisma.vehicle.findMany({
      where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.vehicle.count({ where });

    res.json({
      vehicles,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

exports.updateVehicle = async (req, res) => {
  const { vehicleId } = req.params;
  const { name, type, model, plate, metadata, isActive } = req.body;

  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId: req.user.userId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(model && { model }),
        ...(plate && { plate }),
        ...(metadata && { metadata }),
        ...(isActive !== undefined && { isActive }),
        vehicleLogs: { create: { action: 'UPDATED', details: 'Vehicle fields updated' } }
      }
    });

    res.json({ message: 'Vehicle updated successfully', vehicle: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
};

exports.deleteVehicle = async (req, res) => {
  const { vehicleId } = req.params;

  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId: req.user.userId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { deletedAt: new Date(), isActive: false, vehicleLogs: { create: { action: 'DELETED', details: 'Soft delete' } } }
    });

    res.json({ message: 'Vehicle soft-deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
};

exports.bulkUploadVehicles = async (req, res) => {
  const { vehicles } = req.body; // Array of { name, imei, type, etc. }
  if (!Array.isArray(vehicles)) return res.status(400).json({ error: 'Vehicles must be an array' });

  const userId = req.user.userId;
  const results = { success: [], failed: [] };

  for (const v of vehicles) {
    try {
      if (!isValidIMEI(v.imei)) throw new Error('Invalid IMEI');
      
      const geosurepathDevice = await geosurepathService.createDevice(v.name, v.imei);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.geosurepathUserId) {
        await geosurepathService.linkDeviceToUser(user.geosurepathUserId, geosurepathDevice.id);
      }

      const created = await prisma.vehicle.create({
        data: {
          userId, name: v.name, imei: v.imei, type: v.type, model: v.model, plate: v.plate,
          geosurepathDeviceId: geosurepathDevice.id,
          registrationDate: new Date(),
          vehicleLogs: { create: { action: 'CREATED', details: 'Bulk upload' } }
        }
      });
      results.success.push(created.imei);
    } catch (err) {
      results.failed.push({ imei: v.imei, error: err.message });
    }
  }

  res.json({ message: 'Bulk upload processed', results });
};

// Toggle Engine (Ignition Control System)
exports.toggleEngine = async (req, res) => {
  const { vehicleId, action } = req.body;
  if (!vehicleId || !['engineStop', 'engineResume'].includes(action)) {
    return res.status(400).json({ error: 'Valid vehicleId and action are required.' });
  }

  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId: req.user.userId } });
    if (!vehicle || !vehicle.geosurepathDeviceId) return res.status(404).json({ error: 'Vehicle not found' });

    if (action === 'engineStop') {
      const position = await geosurepathService.getLatestPosition(vehicle.geosurepathDeviceId);
      if (position && position.speed > 20) return res.status(400).json({ error: 'Cannot stop engine while driving over 20km/h.' });
    }

    await geosurepathService.sendCommand(vehicle.geosurepathDeviceId, action);
    await prisma.vehicleLog.create({ data: { vehicleId, action: 'ENGINE_TOGGLE', details: `Action: ${action}` } });

    res.json({ message: `Engine command '${action}' sent successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle engine' });
  }
};

// Toggle Safe Parking
exports.toggleSafeParking = async (req, res) => {
  const { vehicleId, enable, lat, lng, radius } = req.body;
  if (enable && (!lat || !lng)) return res.status(400).json({ error: 'lat and lng are required.' });

  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId: req.user.userId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    let geosurepathGeofenceId = vehicle.geosurepathGeofenceId;

    if (enable) {
      if (!isValidCoords(lat, lng)) return res.status(400).json({ error: 'Invalid coordinates provided.' });
      const area = `CIRCLE (${lat} ${lng}, ${radius || 20})`;
      const geofence = await geosurepathService.createGeofence(`SafeParking_${vehicle.name}`, area);
      geosurepathGeofenceId = geofence.id;
      await geosurepathService.linkGeofenceToDevice(vehicle.geosurepathDeviceId, geosurepathGeofenceId);
    } else if (geosurepathGeofenceId) {
      await geosurepathService.deleteGeofence(geosurepathGeofenceId).catch(() => {});
      geosurepathGeofenceId = null;
    }

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        safeParkingOn: enable,
        parkingLat: enable ? lat : null,
        parkingLng: enable ? lng : null,
        parkingRadius: enable ? radius || 20 : null,
        geosurepathGeofenceId,
        vehicleLogs: { create: { action: 'SAFE_PARKING_TOGGLE', details: `Enable: ${enable}` } }
      }
    });

    res.json({ message: `Safe parking ${enable ? 'enabled' : 'disabled'} successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update safe parking status' });
  }
};

// Custom Alert Rules... (kept same but could add logs)
exports.createAlertRule = async (req, res) => {
  const { vehicleId, type, parameters } = req.body;
  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId: req.user.userId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    const alertRule = await prisma.alertRule.create({ data: { vehicleId, type, parameters: parameters || {} } });
    res.json(alertRule);
  } catch (_error) { res.status(500).json({ error: 'Failed to create alert rule' }); }
};

exports.getAlertRules = async (req, res) => {
  const { vehicleId } = req.params;
  try {
    const rules = await prisma.alertRule.findMany({ where: { vehicleId, vehicle: { userId: req.user.userId } } });
    res.json(rules);
  } catch (_error) { res.status(500).json({ error: 'Failed to fetch alert rules' }); }
};

exports.deleteAlertRule = async (req, res) => {
  const { ruleId } = req.params;
  try {
    const rule = await prisma.alertRule.findFirst({ where: { id: ruleId, vehicle: { userId: req.user.userId } } });
    if (!rule) return res.status(404).json({ error: 'Alert rule not found' });
    await prisma.alertRule.delete({ where: { id: ruleId } });
    res.json({ message: 'Alert rule deleted successfully' });
  } catch (_error) { res.status(500).json({ error: 'Failed to delete alert rule' }); }
};