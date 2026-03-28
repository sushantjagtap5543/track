// src/controllers/adminController.js
// ✅ FIX: Use shared Prisma singleton instead of `new PrismaClient()`.

const os = require('os');
const prisma = require('../lib/prisma');
const geosurepathService = require('../services/geosurepath');

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
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
};

// Get Dashboard Statistics
exports.getStats = async (req, res) => {
  try {
    const totalClients = await prisma.user.count({ where: { role: 'CLIENT', deletedAt: null } });
    const totalVehicles = await prisma.vehicle.count();
    
    // Calculate total revenue from completed payments
    const payments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true }
    });
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    res.json({ totalClients, totalVehicles, totalRevenue });
  } catch (_error) {
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
      geosurepathService
        .updateUser(user.geosurepathUserId, { disabled: !isActive })
        .then(() =>
          console.log(`[Sync] User ${user.email} ${isActive ? 'activated' : 'disabled'} in GeoSurePath.`)
        )
        .catch((syncError) =>
          console.error(`[Sync Error] Failed to sync status for ${user.email}:`, syncError.message)
        );
    }

    res.json({ message: `Client ${isActive ? 'activated' : 'suspended'} successfully`, user });

    // Audit Log
    prisma.auditLog
      .create({
        data: {
          adminId: req.user.userId,
          userId: clientId,
          action: isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER',
          details: 'User status changed by admin.'
        }
      })
      .catch((e) => console.error('Audit failed:', e.message));

  } catch (_error) {
    res.status(500).json({ error: 'Failed to update client status' });
  }
};

// NEW: Get All Users with Pagination, Search, and Filters
exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 10, search = '', role, isActive } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {
      deletedAt: null,
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ],
      ...(role && { role }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const users = await prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, username: true, role: true, 
        isActive: true, createdAt: true, lastLoginAt: true
      }
    });

    const total = await prisma.user.count({ where });

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// NEW: Bulk Update User Status
exports.bulkUpdateStatus = async (req, res) => {
  const { userIds, isActive } = req.body;
  if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds must be an array' });

  try {
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive }
    });

    res.json({ message: `Successfully ${isActive ? 'activated' : 'suspended'} ${userIds.length} users` });
  } catch (error) {
    res.status(500).json({ error: 'Bulk status update failed' });
  }
};

// NEW: Bulk Soft Delete Users
exports.bulkDeleteUsers = async (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds must be an array' });

  try {
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { deletedAt: new Date(), isActive: false }
    });

    res.json({ message: `Successfully soft-deleted ${userIds.length} users` });
  } catch (error) {
    res.status(500).json({ error: 'Bulk deletion failed' });
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

// Get Sovereign Audit Logs
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true } } }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit ledger' });
  }
};

// Adjust Expiry / Extend Grace (VIP Override)
exports.adjustExpiry = async (req, res) => {
  const { userId, extensionDays } = req.body;
  
  if (!extensionDays || extensionDays < 1) {
    return res.status(400).json({ error: 'Extension days must be a positive number.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newGraceDate = new Date();
    newGraceDate.setDate(newGraceDate.getDate() + parseInt(extensionDays));

    await prisma.user.update({
      where: { id: userId },
      data: { graceExtensionUntil: newGraceDate, isActive: true }
    });

    // Automatically re-activate Traccar engine
    if (user.geosurepathUserId) {
        await geosurepathService.updateUser(user.geosurepathUserId, { disabled: false });
    }

    // Also sync the latest subscription expiresAt if it exists to keep calendars clean
    const latestSub = await prisma.subscription.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' }
    });
    if (latestSub && new Date(latestSub.expiresAt) < newGraceDate) {
        await prisma.subscription.update({
            where: { id: latestSub.id },
            data: { expiresAt: newGraceDate }
        });
    }

    // Log the override
    await prisma.auditLog.create({
      data: {
        adminId: req.user.userId,
        userId: userId,
        action: 'EXTEND_GRACE',
        details: `VIP Access extended for ${extensionDays} days. Expires: ${newGraceDate.toISOString()}`
      }
    });

    res.json({ message: `VIP Override active. Account secured for another ${extensionDays} days.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to adjust expiry.' });
  }
};