// src/controllers/adminController.js
const os = require('os');
const { PrismaClient } = require('@prisma/client');
const geosurepathService = require('../services/geosurepath');
const prisma = new PrismaClient();

// Get System Health (CPU, Memory, Uptime)
exports.getSystemHealth = async (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = os.uptime();
    const loadAvg = os.loadavg();
    
    // Node.js process runtime
    const processUptime = process.uptime();

    res.json({
      cpuLoad: loadAvg,
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        percentageUsed: ((usedMem / totalMem) * 100).toFixed(2)
      },
      systemUptime: uptime,
      processUptime: processUptime
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
};

// Get Dashboard Statistics
exports.getStats = async (req, res) => {
  try {
    const totalClients = await prisma.user.count({ where: { role: 'CLIENT' } });
    const totalVehicles = await prisma.vehicle.count();
    
    // Calculate total revenue from completed payments
    const payments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true }
    });
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    res.json({ totalClients, totalVehicles, totalRevenue });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
};

// Manage Clients (Suspend / Activate)
exports.updateClientStatus = async (req, res) => {
  const { clientId, isActive } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: clientId },
      data: { isActive: isActive }
    });
    
    // Sync with GeoSurePath: If not active, disable in GeoSurePath
    if (user.geosurepathUserId) {
        try {
            await geosurepathService.updateUser(user.geosurepathUserId, { disabled: !isActive });
            console.log(`[Sync] User ${user.email} ${isActive ? 'activated' : 'disabled'} in GeoSurePath.`);
        } catch (syncError) {
            console.error(`[Sync Error] Failed to sync status for ${user.email}:`, syncError.message);
            // We continue even if sync fails
        }
    }

    res.json({ message: `Client ${isActive ? 'activated' : 'suspended'} successfully`, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client status' });
  }
};

// Get Advanced Analytics (MRR, Churn, Heatmap)
exports.getAdvancedStats = async (req, res) => {
  try {
    // 1. Calculate MRR
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true }
    });

    const mrr = activeSubscriptions.reduce((sum, sub) => {
      const monthlyPrice = sub.plan?.billingCycle === 'YEARLY' ? sub.price / 12 : sub.price;
      return sum + monthlyPrice;
    }, 0);

    // 2. Calculate Churn Rate (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const churnedUsers = await prisma.subscription.count({
      where: {
        status: 'EXPIRED',
        updatedAt: { gte: thirtyDaysAgo }
      }
    });

    const totalSubscribedUsers = await prisma.user.count({
      where: {
        subscriptions: { some: { status: 'ACTIVE' } }
      }
    });

    const churnRate = totalSubscribedUsers > 0 ? (churnedUsers / (totalSubscribedUsers + churnedUsers)) * 100 : 0;

    // 3. Get Heatmap Data (Vehicle Positions)
    const heatmapData = await geosurepathService.getAllLatestPositions();

    res.json({
      mrr,
      churnRate: churnRate.toFixed(2),
      heatmapData: heatmapData.map(p => ({ lat: p.latitude, lng: p.longitude, weight: 1 }))
    });
  } catch (error) {
    console.error('Advanced stats error:', error);
    res.status(500).json({ error: 'Failed to fetch advanced analytics' });
  }
};
