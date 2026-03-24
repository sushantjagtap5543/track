// src/controllers/reportController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: \"file:./prisma/dev.db\" } } });

// In a real system, these would fetch from Traccar's API (/api/reports/trips, /api/reports/summary)
// and aggregate based on user's authorized vehicles.

exports.getTrips = async (req, res) => {
  const { deviceId, from, to } = req.query;
  
  try {
    // Security check: ensure deviceId belongs to the user
    const vehicle = await prisma.vehicle.findFirst({
        where: { traccarDeviceId: parseInt(deviceId), userId: req.user.userId }
    });
    if (!vehicle) return res.status(403).json({ error: 'Access denied to this device' });

    const response = await fetch(`${process.env.TRACCAR_URL}/api/reports/trips?deviceId=${deviceId}&from=${from}&to=${to}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.TRACCAR_ADMIN_EMAIL}:${process.env.TRACCAR_ADMIN_PASSWORD}`).toString('base64')
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch trips from Traccar');
    
    const trips = await response.json();
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate trip report', details: error.message });
  }
};

exports.getSummary = async (req, res) => {
  const { deviceId, from, to } = req.query;
  
  try {
    // Security check: ensure deviceId belongs to the user
    const vehicle = await prisma.vehicle.findFirst({
        where: { traccarDeviceId: parseInt(deviceId), userId: req.user.userId }
    });
    if (!vehicle) return res.status(403).json({ error: 'Access denied to this device' });

    const response = await fetch(`${process.env.TRACCAR_URL}/api/reports/summary?deviceId=${deviceId}&from=${from}&to=${to}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.TRACCAR_ADMIN_EMAIL}:${process.env.TRACCAR_ADMIN_PASSWORD}`).toString('base64')
      }
    });

    if (!response.ok) throw new Error('Failed to fetch summary from Traccar');
    
    const summary = await response.json();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate summary report', details: error.message });
  }
};
