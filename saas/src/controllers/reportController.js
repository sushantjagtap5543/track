// src/controllers/reportController.js
// ✅ FIX 1 (CRITICAL): Removed hardcoded `{ datasources: { db: { url: "file:./prisma/dev.db" } } }`
//    which forced ALL report queries to a local SQLite dev file instead of the production
//    PostgreSQL database set in DATABASE_URL. This silently broke every report in production.
// ✅ FIX 2: Use shared Prisma singleton to avoid connection pool exhaustion.

const prisma = require('../lib/prisma');
const geosurepathService = require('../services/geosurepath');

// Helper for proxying report requests with security check
const proxyReport = async (req, res, reportType) => {
  const { deviceId, from, to } = req.query;

  if (!deviceId || !from || !to) {
    return res.status(400).json({ error: 'deviceId, from, and to query parameters are required.' });
  }

  try {
    // Security check: ensure deviceId belongs to the requesting user
    const vehicle = await prisma.vehicle.findFirst({
      where: { geosurepathDeviceId: parseInt(deviceId), userId: req.user.userId }
    });
    if (!vehicle && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied to this device' });
    }

    const url = `${process.env.GEOSUREPATH_URL}/api/reports/${reportType}?deviceId=${deviceId}&from=${from}&to=${to}`;
    const response = await geosurepathService.fetchWithSessionRefresh(url, {
      headers: geosurepathService.getAuthHeaders()
    });

    if (!response.ok) throw new Error(`GeoSurePath returned ${response.status}`);

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: `Failed to generate ${reportType} report`, details: error.message });
  }
};

exports.getTrips = (req, res) => proxyReport(req, res, 'trips');

exports.getSummary = (req, res) => proxyReport(req, res, 'summary');
exports.getCombined = (req, res) => proxyReport(req, res, 'combined');
exports.getEvents = (req, res) => proxyReport(req, res, 'events');
exports.getStops = (req, res) => proxyReport(req, res, 'stops');
exports.getRoute = (req, res) => proxyReport(req, res, 'route');