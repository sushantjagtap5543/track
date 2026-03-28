// src/controllers/reportController.js
// ✅ FIX 1 (CRITICAL): Removed hardcoded `{ datasources: { db: { url: "file:./prisma/dev.db" } } }`
//    which forced ALL report queries to a local SQLite dev file instead of the production
//    PostgreSQL database set in DATABASE_URL. This silently broke every report in production.
// ✅ FIX 2: Use shared Prisma singleton to avoid connection pool exhaustion.

const prisma = require('../lib/prisma');

// Fetch trip reports for a device from GeoSurePath
exports.getTrips = async (req, res) => {
  const { deviceId, from, to } = req.query;

  if (!deviceId || !from || !to) {
    return res.status(400).json({ error: 'deviceId, from, and to query parameters are required.' });
  }

  try {
    // Security check: ensure deviceId belongs to the requesting user
    const vehicle = await prisma.vehicle.findFirst({
      where: { geosurepathDeviceId: parseInt(deviceId), userId: req.user.userId }
    });
    if (!vehicle) return res.status(403).json({ error: 'Access denied to this device' });

    const response = await fetch(
      `${process.env.GEOSUREPATH_URL}/api/reports/trips?deviceId=${deviceId}&from=${from}&to=${to}`,
      {
        headers: {
          'Authorization':
            'Basic ' +
            Buffer.from(
              `${process.env.GEOSUREPATH_ADMIN_EMAIL}:${process.env.GEOSUREPATH_ADMIN_PASSWORD}`
            ).toString('base64')
        }
      }
    );

    if (!response.ok) throw new Error(`GeoSurePath returned ${response.status}`);

    const trips = await response.json();
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate trip report', details: error.message });
  }
};

// Fetch summary report for a device from GeoSurePath
exports.getSummary = async (req, res) => {
  const { deviceId, from, to } = req.query;

  if (!deviceId || !from || !to) {
    return res.status(400).json({ error: 'deviceId, from, and to query parameters are required.' });
  }

  try {
    // Security check: ensure deviceId belongs to the requesting user
    const vehicle = await prisma.vehicle.findFirst({
      where: { geosurepathDeviceId: parseInt(deviceId), userId: req.user.userId }
    });
    if (!vehicle) return res.status(403).json({ error: 'Access denied to this device' });

    const response = await fetch(
      `${process.env.GEOSUREPATH_URL}/api/reports/summary?deviceId=${deviceId}&from=${from}&to=${to}`,
      {
        headers: {
          'Authorization':
            'Basic ' +
            Buffer.from(
              `${process.env.GEOSUREPATH_ADMIN_EMAIL}:${process.env.GEOSUREPATH_ADMIN_PASSWORD}`
            ).toString('base64')
        }
      }
    );

    if (!response.ok) throw new Error(`GeoSurePath returned ${response.status}`);

    const summary = await response.json();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate summary report', details: error.message });
  }
};