// src/controllers/adminController.js
const os = require('os');
const { PrismaClient } = require('@prisma/client');
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
    
    // Note: To fully suspend, we might need to send a command to Traccar to disable the user as well.
    // fetch(`${process.env.TRACCAR_URL}/api/users/${user.traccarUserId}`, { method: 'PUT', ... body: { disabled: !isActive } })

    res.json({ message: `Client ${isActive ? 'activated' : 'suspended'} successfully`, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client status' });
  }
};
