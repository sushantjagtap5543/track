// src/controllers/adminController.js
// ✅ FIX: Use shared Prisma singleton instead of `new PrismaClient()`.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const os = require('os');
const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const geosurepathService = require('../services/geosurepath');
const analyticsService = require('../services/analyticsService');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);
const { logAction, AUDIT_ACTIONS } = require('../services/auditService');
const { emailQueue } = require('../services/queue'); // ✅ FIXED: Pointing to correct service

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

    const bytesToGB = (bytes) => (bytes / (1024 ** 3)).toFixed(2);

    res.json({
      cpuLoad: loadAvg,
      memory: {
        total: `${bytesToGB(totalMem)} GB`,
        free: `${bytesToGB(freeMem)} GB`,
        used: `${bytesToGB(usedMem)} GB`,
        percentageUsed: ((usedMem / totalMem) * 100).toFixed(2)
      },
      systemUptime: uptime,
      processUptime: processUptime
    });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
};

// Get Dashboard Statistics (Enhanced for Business Analysis)
exports.getStats = async (req, res) => {
  try {
    const stats = await analyticsService.getSummaryStats();
    
    res.json({ 
      totalClients: stats.totalClients, 
      totalVehicles: stats.totalVehicles, 
      activeVehicles: stats.activeVehicles,
      inactiveVehicles: stats.inactiveVehicles,
      totalRevenue: stats.totalRevenue,
      projectedRevenue: stats.mrr,
      distribution: stats.distribution,
      planDistribution: stats.planDistribution || {} // ✅ New: Breakdown by plan
    });
  } catch (_error) {
    console.error('Stats error:', _error);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
};

// Manage Clients (Suspend / Activate)
exports.updateClientStatus = async (req, res) => {
  const { clientId, isActive } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: clientId },
      data: { 
        isActive: isActive,
        ...(isActive && { loginAttempts: 0, lockUntil: null }) // ✅ Reset lock on activation
      }
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
    logAction({
      adminId: req.user.userId,
      userId: clientId,
      action: isActive ? AUDIT_ACTIONS.ACTIVATE_USER : AUDIT_ACTIONS.SUSPEND_USER,
      details: { targetStatus: isActive },
      ipAddress: req.ip
    });

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
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, geosurepathUserId: { not: null } },
      select: { id: true, email: true, geosurepathUserId: true }
    });

    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive }
    });

    // ✅ FIX: Sync bulk status to GeoSurePath
    users.forEach(user => {
        geosurepathService.updateUser(user.geosurepathUserId, { disabled: !isActive })
            .catch(e => console.error(`[BulkSync] Failed for ${user.email}:`, e.message));
    });

    res.json({ message: `Successfully ${isActive ? 'activated' : 'suspended'} ${userIds.length} users` });

    // Audit Log for Bulk Action
    logAction({
      adminId: req.user.userId,
      action: isActive ? AUDIT_ACTIONS.BULK_ACTIVATE_USERS : AUDIT_ACTIONS.BULK_SUSPEND_USERS,
      details: { count: userIds.length, emails: users.map(u => u.email) },
      ipAddress: req.ip
    });

  } catch (error) {
    res.status(500).json({ error: 'Bulk status update failed' });
  }
};

// NEW: Bulk Soft Delete Users
exports.bulkDeleteUsers = async (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds must be an array' });

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, geosurepathUserId: { not: null } },
      select: { id: true, email: true, geosurepathUserId: true }
    });

    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { deletedAt: new Date(), isActive: false }
    });

    // ✅ FIX: Sync bulk deletion to GeoSurePath (Disable users)
    users.forEach(user => {
        geosurepathService.updateUser(user.geosurepathUserId, { disabled: true })
            .catch(e => console.error(`[BulkDeleteSync] Failed for ${user.email}:`, e.message));
    });

    res.json({ message: `Successfully soft-deleted ${userIds.length} users` });

    // Audit Log
    logAction({
        adminId: req.user.userId,
        action: AUDIT_ACTIONS.BULK_DELETE_USERS,
        details: { count: userIds.length, emails: users.map(u => u.email) },
        ipAddress: req.ip
    });

  } catch (error) {
    res.status(500).json({ error: 'Bulk deletion failed' });
  }
};

// Get Advanced Analytics (MRR, Churn, Heatmap)
exports.getAdvancedStats = async (req, res) => {
  try {
    const [mrr, churnRate, heatmapData] = await Promise.all([
      analyticsService.calculateMRR(),
      analyticsService.calculateChurnRate(),
      geosurepathService.getAllLatestPositions()
    ]);

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

// Get System Audit Logs
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

// NOTE: adjustExpiry is defined below (around line 816+) as the authoritative version.
// The earlier definition was a duplicate and has been removed to prevent Node.js from
// silently discarding the more complete logic below.

// ─── ADMIN SETTINGS (Consolidated) ───
exports.getSettings = async (req, res) => {
  try {
    const settings = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
    if (!settings) {
      return res.json({ taxRate: 18, supportEmail: 'support@geosurepath.com', currency: 'INR', currencySymbol: '₹' });
    }
    // Mask sensitive keys
    const masked = { ...settings };
    if (masked.razorpaySecret) masked.razorpaySecret = '••••••••';
    res.json(masked);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
};

exports.updateSettings = async (req, res) => {
  const data = req.body;
  try {
    const settings = await prisma.adminSetting.upsert({
      where: { id: 'GLOBAL' },
      update: { 
        ...data,
        updatedBy: req.user.userId 
      },
      create: { 
        ...data, 
        id: 'GLOBAL', 
        updatedBy: req.user.userId 
      },
    });
    res.json({ message: 'Global system configuration updated.', settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update system configuration.' });
  }
};

// NEW: Manual User Subscription Update
exports.updateUserSubscription = async (req, res) => {
    const { userId, planId, status, expiresAt, role, isActive } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found in SaaS Ledger.' });

    // ✅ UPDATE USER CORE DATA
    if (role || isActive !== undefined) {
        await prisma.user.update({
            where: { id: userId },
            data: { 
                ...(role && { role }),
                ...(isActive !== undefined && { isActive })
            }
        });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (planId) updateData.planId = planId;
    if (expiresAt) updateData.expiresAt = new Date(expiresAt);
    if (isActive !== undefined) updateData.status = isActive ? 'ACTIVE' : 'EXPIRED';

    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData
      });
    } else if (planId || isActive !== undefined) {
      // Create new if none exists
      await prisma.subscription.create({
        data: {
          userId,
          planId: planId || 'BASIC_MONTHLY',
          status: status || (isActive === false ? 'EXPIRED' : 'ACTIVE'),
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          price: 0 // Manual override
        }
      });
    }

    // Sync status to Traccar if suspended
    if (status === 'EXPIRED' || status === 'CANCELLED') {
      if (user.geosurepathUserId) {
        await geosurepathService.updateUser(user.geosurepathUserId, { disabled: true });
      }
    } else if (status === 'ACTIVE') {
      if (user.geosurepathUserId) {
        await geosurepathService.updateUser(user.geosurepathUserId, { disabled: false });
      }
    }

    res.json({ message: 'User subscription updated successfully' });

    logAction({
      adminId: req.user.userId,
      userId,
      action: AUDIT_ACTIONS.MANUAL_SUBSCRIPTION_UPDATE,
      details: { planId, status, expiresAt },
      ipAddress: req.ip
    });

  } catch (error) {
    res.status(500).json({ error: 'Subscription update failed' });
  }
};

// NOTE: getFullStatus is defined below (around line 770+) as the authoritative version.
// The earlier definition was a duplicate and has been removed.

// NOTE: getPlans, createPlan, updatePlan, deletePlan are defined below (line ~928+)
// as the authoritative versions with full audit logging and features support.
// These earlier duplicates have been removed to prevent Node.js silently overriding them.

// NEW: Administrative Session Proxy (View as User)
exports.impersonateUser = async (req, res) => {
  const { userId } = req.body;
  try {
    const targetUser = await prisma.user.findUnique({ 
        where: { id: userId },
        include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Ensure we don't impersonate another admin (security measure)
    // SUPER ADMIN EXEMPTION: Allow impersonation of other admins for training/support if needed
    // if (targetUser.role === 'ADMIN') return res.status(403).json({ error: 'Cannot impersonate another administrator.' });

    // Helper: Generate Tokens
    const generateTokens = async (userId, role, geosurepathUserId, uaHash = null) => {
      const accessToken = jwt.sign(
        { 
          userId, 
          role, 
          geosurepathUserId, 
          uaHash,
          isGhost: true,
          impersonatedBy: req.user.userId 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      return { accessToken };
    };

    const uaHash = crypto.createHash('md5').update(req.headers['user-agent'] || '').digest('hex');
    const { accessToken } = await generateTokens(targetUser.id, targetUser.role, targetUser.geosurepathUserId, uaHash);

    res.json({ accessToken, user: targetUser });

    // Audit Log
    logAction({
      adminId: req.user.userId,
      userId: targetUser.id,
      action: AUDIT_ACTIONS.ADMIN_VIEW_USER_SESSION,
      details: { target: targetUser.email, reason: 'Administrative Support' },
      ipAddress: req.ip
    });

  } catch (error) {
    res.status(500).json({ error: 'Impersonation failed.' });
  }
};

// NEW: Exit Impersonation Mode
exports.exitImpersonation = async (req, res) => {
    try {
        if (!req.user.isGhost) {
            return res.status(400).json({ error: 'You are not in a ghost session.' });
        }

        logAction({
            adminId: req.user.impersonatedBy,
            userId: req.user.userId,
            action: AUDIT_ACTIONS.EXIT_ADMIN_VIEW_SESSION,
            details: { message: 'Admin exited ghost session' },
            ipAddress: req.ip
        });

        res.json({ message: 'Session terminated. Returning to administrator view.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to exit impersonation.' });
    }
};

// NEW: Manual Client Onboarding by Admin
exports.createUser = async (req, res) => {
  const { name, email, password, role = 'CLIENT' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    // 1. Check if user already exists in SaaS
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User already exists with this email.' });

    // 2. Create in GeoSurePath first
    let gUser;
    try {
      gUser = await geosurepathService.createUser(name, email, password);
      console.log(`[AdminOnboard] Created GeoSurePath user for ${email} (ID: ${gUser.id})`);
    } catch (gsErr) {
      console.error('[AdminOnboard] GeoSurePath creation failed:', gsErr.message);
      return res.status(500).json({ error: 'Failed to create user in tracking engine.' });
    }

    // 3. Create in SaaS DB
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        geosurepathUserId: gUser.id,
        isActive: true,
        isVerified: true 
      }
    });

    // 4. Send Welcome Email
    emailQueue.add('welcome-email', {
      to: user.email,
      subject: 'Welcome to GeoSurePath - Admin Onboarding',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #3b82f6;">Welcome to GeoSurePath</h2>
          <p>Hello ${name},</p>
          <p>An administrator has manually onboarded you to the GeoSurePath platform.</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Login Email:</strong> ${email}<br>
            <strong>Default Password:</strong> ${password}
          </div>
          <p>Please login and change your password immediately.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Login Now</a>
        </div>
      `
    }).catch(e => console.error('[AdminOnboard] Email failed:', e.message));

    // 5. Audit Log
    logAction({
      adminId: req.user.userId,
      userId: user.id,
      action: AUDIT_ACTIONS.MANUAL_USER_ONBOARD,
      details: { email, role },
      ipAddress: req.ip
    });

    res.status(201).json({ message: 'User onboarded successfully', user: { id: user.id, email: user.email } });

  } catch (error) {
    console.error('[AdminOnboard] Error:', error);
    res.status(500).json({ error: 'Internal server error during onboarding.' });
  }
};

// NEW: Update User Role (Administrative Permission Management)
exports.updateUserRole = async (req, res) => {
  const { userId, role } = req.body;
  if (!['ADMIN', 'MANAGER', 'CLIENT'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role provided.' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    // ✅ SYNC (S99): Instantly synchronize administrative permissions to Traccar
    if (user.geosurepathUserId) {
        await geosurepathService.updateUser(user.geosurepathUserId, { administrator: role === 'ADMIN' })
            .catch(e => console.error(`[AdminRoleSync] Traccar sync failed for ${user.email}:`, e.message));
    }

    // Audit Log
    logAction({
      adminId: req.user.userId,
      userId: userId,
      action: AUDIT_ACTIONS.UPDATE_USER_ROLE,
      details: { email: user.email, newRole: role },
      ipAddress: req.ip
    });

    res.json({ message: `User role successfully updated to ${role}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role.' });
  }
};

// NEW: Bulk Device Provisioning for Enterprise Clients
exports.bulkCreateDevices = async (req, res) => {
  const { userId, devices } = req.body; // devices: [{ name, uniqueId }]
  if (!userId || !Array.isArray(devices)) {
    return res.status(400).json({ error: 'UserId and devices array are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found in SaaS Ledger.' });

    // ✅ RECOVERY: If engine ID is missing, try a lookup by email
    if (!user.geosurepathUserId) {
        const engineUser = await geosurepathService.getUserByEmail(user.email);
        if (engineUser) {
            await prisma.user.update({ where: { id: userId }, data: { geosurepathUserId: engineUser.id } });
            user.geosurepathUserId = engineUser.id;
        } else {
            return res.status(404).json({ error: `User ${user.email} lacks a tracking engine ID and was not found in Traccar. Please sync or onboard first.` });
        }
    }

    const results = [];
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < devices.length; i += BATCH_SIZE) {
        const batch = devices.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (dev) => {
            try {
                // 1. Create in GeoSurePath
                const gDevice = await geosurepathService.createDevice(dev.name, dev.uniqueId);
                // 2. Link to User
                await geosurepathService.linkDeviceToUser(user.geosurepathUserId, gDevice.id);
                // 3. Register in SaaS Ledger for Billing
                await prisma.vehicle.upsert({
                    where: { imei: String(dev.uniqueId) },
                    update: { 
                        name: dev.name, 
                        userId, 
                        geosurepathDeviceId: gDevice.id, 
                        isActive: true,
                        deletedAt: null 
                    },
                    create: { 
                        name: dev.name, 
                        imei: String(dev.uniqueId), 
                        userId, 
                        geosurepathDeviceId: gDevice.id,
                        registrationDate: new Date()
                    }
                });
                results.push({ name: dev.name, status: 'success', id: gDevice.id });
            } catch (err) {
                results.push({ name: dev.name, status: 'error', error: err.message });
            }
        }));

        // Throttling for Enterprise Sync Stability
        if (i + BATCH_SIZE < devices.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Audit Log
    logAction({
      adminId: req.user.userId,
      userId: userId,
      action: AUDIT_ACTIONS.BULK_DEVICE_PROVISION,
      details: { successCount: results.filter(r => r.status === 'success').length, totalCount: devices.length },
      ipAddress: req.ip
    });

    res.json({ message: 'Bulk provisioning complete.', results });
  } catch (error) {
    res.status(500).json({ error: 'Bulk provisioning failed.' });
  }
};
// NEW: Administrative Session Audit
exports.getUserSessions = async (req, res) => {
  const { userId } = req.params;
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, expiresAt: true }
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user sessions.' });
  }
};

// ─── SYSTEM FULL STATUS ────────────────────────────────────────────────────────
exports.getFullStatus = async (req, res) => {
  try {
    const http = require('http');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const bytesToGB = (b) => (b / 1024 ** 3).toFixed(2);

    // Check Traccar reachability
    let traccarStatus = 'Unknown';
    try {
      await new Promise((resolve, reject) => {
        const req2 = http.get('http://localhost:8082/api/server', (r) => {
          traccarStatus = r.statusCode < 400 ? 'Running' : 'Error';
          resolve();
        });
        req2.on('error', () => { traccarStatus = 'Offline'; resolve(); });
        req2.setTimeout(2000, () => { traccarStatus = 'Timeout'; resolve(); });
      });
    } catch (_) { traccarStatus = 'Offline'; }

    // Check DB
    let dbStatus = 'Connected';
    try { await prisma.$queryRaw`SELECT 1`; } catch (_) { dbStatus = 'Disconnected'; }

    res.json({
      status: 'Online',
      db: dbStatus,
      traccar: traccarStatus,
      cpuLoad: os.loadavg(),
      memory: {
        total: `${bytesToGB(totalMem)} GB`,
        free: `${bytesToGB(freeMem)} GB`,
        used: `${bytesToGB(usedMem)} GB`,
        percentageUsed: ((usedMem / totalMem) * 100).toFixed(2),
      },
      systemUptime: os.uptime(),
      processUptime: process.uptime(),
    });
  } catch (error) {
    console.error('[getFullStatus]', error);
    res.status(500).json({ error: 'Failed to get system status.' });
  }
};

// ─── ADJUST SUBSCRIPTION EXPIRY ───────────────────────────────────────────────
exports.adjustExpiry = async (req, res) => {
  const { userId, days } = req.body;
  if (!userId || !days) return res.status(400).json({ error: 'userId and days are required.' });

  try {
    const daysInt = parseInt(days, 10);
    const sub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) return res.status(404).json({ error: 'No subscription history found for this user.' });

    const currentExpiry = sub.expiresAt ? new Date(sub.expiresAt) : new Date();
    if (currentExpiry < new Date()) currentExpiry.setTime(new Date().getTime()); // reset to now if already expired
    currentExpiry.setDate(currentExpiry.getDate() + daysInt);

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { expiresAt: currentExpiry, status: 'ACTIVE' },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });

    logAction({
      adminId: req.user?.userId,
      userId,
      action: 'ADJUST_EXPIRY',
      details: `Extended by ${daysInt} days. New expiry: ${currentExpiry.toISOString()}`,
      ipAddress: req.ip,
    });

    res.json({ message: `Subscription extended by ${daysInt} days.`, subscription: updated });
  } catch (error) {
    console.error('[adjustExpiry]', error);
    res.status(500).json({ error: 'Failed to adjust expiry.' });
  }
};

// ─── DELETE USER (Soft Delete) ─────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId is required.' });

  try {
    // Prevent deleting self
    if (req.user?.userId === userId) {
      return res.status(403).json({ error: 'You cannot delete your own account.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'ADMIN') return res.status(403).json({ error: 'Cannot delete an admin account.' });

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Disable in Traccar too
    if (user.geosurepathUserId) {
      geosurepathService.updateUser(user.geosurepathUserId, { disabled: true })
        .catch(e => console.error(`[DeleteSync] ${e.message}`));
    }

    logAction({
      adminId: req.user?.userId,
      userId,
      action: 'DELETE_USER',
      details: `Soft-deleted user: ${user.email}`,
      ipAddress: req.ip,
    });

    res.json({ message: `User ${user.email} deleted successfully.` });
  } catch (error) {
    console.error('[deleteUser]', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};

exports.syncDevicesForUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!user.geosurepathUserId) return res.status(400).json({ error: 'User has no linked Traccar account.' });

    // ✅ REFINEMENT: Use the high-precision sync engine from billingController
    const { syncUserDevices } = require('./billingController');
    await syncUserDevices(userId, user.geosurepathUserId);

    const count = await prisma.vehicle.count({ where: { userId, deletedAt: null } });

    logAction({
      adminId: req.user?.userId,
      userId,
      action: 'SYNC_DEVICES',
      details: `Refined sync completed for ${user.email}. Total active: ${count}`,
      ipAddress: req.ip,
    });

    res.json({ message: `Sync complete. ${count} active devices found in ledger.`, count });
  } catch (error) {
    console.error('[syncDevicesForUser]', error);
    res.status(500).json({ error: 'Device sync failed.' });
  }
};

// ─── PLANS MANAGEMENT ─────────────────────────────────────────────────────────
exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans.' });
  }
};

exports.createPlan = async (req, res) => {
  const { name, description, pricePerDevice, billingCycle, features } = req.body;
  try {
    const plan = await prisma.plan.create({
      data: { name, description, pricePerDevice: parseFloat(pricePerDevice), billingCycle: billingCycle || 'MONTHLY', features: features || [] }
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan.' });
  }
};

exports.updatePlan = async (req, res) => {
  const { id, name, description, pricePerDevice, billingCycle, features } = req.body;
  try {
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(pricePerDevice !== undefined && { pricePerDevice: parseFloat(pricePerDevice) }),
        ...(billingCycle && { billingCycle }),
        ...(features && { features }),
      }
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan.' });
  }
};

exports.deletePlan = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.plan.delete({ where: { id } });
    res.json({ message: 'Plan deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan.' });
  }
};

// ─── ADVANCED ANALYTICS ───────────────────────────────────────────────────────
exports.getAdvancedStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, overdueUsers, totalPayments, recentPayments] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      // ✅ FIX: Subscription model has no `isActive` field. Use `status` instead.
      prisma.subscription.count({ where: { status: { not: 'ACTIVE' }, expiresAt: { lt: new Date() } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'CAPTURED' } }),
      prisma.payment.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } } } }),
    ]);

    res.json({
      totalUsers,
      activeUsers,
      overdueAccounts: overdueUsers,
      totalRevenue: totalPayments._sum.amount || 0,
      recentPayments,
    });
  } catch (error) {
    console.error('[getAdvancedStats]', error);
    res.status(500).json({ error: 'Failed to fetch advanced stats.' });
  }
};

// ─── DUPLICATE-FREE revokeUserSession (keep only one) ─────────────────────────
exports.revokeUserSession = async (req, res) => {
  const { userId, sessionId } = req.params;
  try {
    await prisma.refreshToken.delete({ where: { id: sessionId, userId } });
    res.json({ message: 'User session successfully terminated by administrator.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate user session.' });
  }
};

// --- SERVICE MANAGEMENT (NEW) ---

exports.getServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services.' });
  }
};

exports.createService = async (req, res) => {
  const { name, description, price, category } = req.body;
  try {
    const service = await prisma.service.create({
      data: { name, description, price: parseFloat(price), category }
    });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service.' });
  }
};

exports.updateService = async (req, res) => {
  const { id, name, description, price, category } = req.body;
  try {
    const service = await prisma.service.update({
      where: { id },
      data: { name, description, price: parseFloat(price), category }
    });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service.' });
  }
};

exports.deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.service.delete({ where: { id } });
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service.' });
  }
};

// --- USER SERVICE PROVISIONING (NEW) ---

// Correcting misplaced provisionService change
exports.provisionService = async (req, res) => {
  const { userId, serviceId, amountOverride } = req.body;
  try {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const userService = await prisma.userService.create({
      data: {
        userId,
        serviceId,
        amount: amountOverride !== undefined ? parseFloat(amountOverride) : service.price,
        status: 'ACTIVE'
      }
    });

    res.json({ message: 'Service provisioned successfully', userService });
  } catch (error) {
    res.status(500).json({ error: 'Failed to provision service.' });
  }
};

exports.deprovisionService = async (req, res) => {
  const { userServiceId } = req.body;
  try {
    await prisma.userService.update({
      where: { id: userServiceId },
      data: { status: 'CANCELLED' }
    });
    res.json({ message: 'Service de-provisioned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to de-provision service.' });
  }
};

exports.getUserServicesForAdmin = async (req, res) => {
  const { userId } = req.params;
  try {
    const services = await prisma.userService.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { service: true }
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user services.' });
  }
};

// ─── SYNC ALL DEVICES (Maintenance) ──────────────────────────────────────────
exports.syncAllDevices = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'CLIENT', deletedAt: null, geosurepathUserId: { not: null } },
      select: { id: true, email: true, geosurepathUserId: true }
    });

    const { syncUserDevices } = require('./billingController');
    let totalProcessedUsers = 0;

    for (const user of users) {
      try {
        // ✅ FIX: Removed dead uaHash computation (it was computed but never used)
        await syncUserDevices(user.id, user.geosurepathUserId);
        totalProcessedUsers++;
      } catch (err) {
        console.error(`[GlobalSync] Failed for ${user.email}:`, err.message);
      }
    }

    logAction({
      adminId: req.user?.userId,
      action: 'SYNC_ALL_DEVICES',
      details: `Global sync completed for ${totalProcessedUsers} clients.`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Global system-wide sync completed successfully.', processed: totalProcessedUsers });
  } catch (error) {
    console.error('[syncAllDevices]', error);
    res.status(500).json({ error: 'Failed to perform global sync.' });
  }
};

// NEW: Revoke all sessions for a user
exports.revokeAllUserSessions = async (req, res) => {
  const { userId } = req.params;
  try {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    
    logAction({
      adminId: req.user?.userId,
      userId,
      action: AUDIT_ACTIONS.REVOKE_ALL_SESSIONS,
      details: 'All active refresh tokens revoked by administrator.',
      ipAddress: req.ip
    });

    res.json({ message: 'All user sessions successfully terminated.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate user sessions.' });
  }
};

// NEW: Get Expiry Status for all users (Expired and Nearly Expired)
exports.getUsersExpiryStatus = async (req, res) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const users = await prisma.user.findMany({
      where: { deletedAt: null, role: 'CLIENT' },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const expired = [];
    const nearlyExpired = [];

    users.forEach(user => {
      const sub = user.subscriptions[0];
      if (!sub) {
        expired.push({ id: user.id, email: user.email, status: 'NO_SUBSCRIPTION' });
        return;
      }

      const expiryDate = new Date(sub.expiresAt);
      if (expiryDate < now) {
        expired.push({ id: user.id, email: user.email, expiryDate, status: 'EXPIRED' });
      } else if (expiryDate < threeDaysFromNow) {
        nearlyExpired.push({ id: user.id, email: user.email, expiryDate, status: 'NEARLY_EXPIRED' });
      }
    });

    res.json({ expired, nearlyExpired });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expiry status.' });
  }
};

// NEW: Upgrade User (Level Upgrader)
exports.upgradeUser = async (req, res) => {
  const { userId } = req.params;
  const { planId, deviceCount, extensionDays } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const extension = parseInt(extensionDays) || 30;
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + extension);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId: planId || 'BASIC_MONTHLY',
        deviceCount: parseInt(deviceCount) || 1,
        expiresAt: newExpiry,
        price: 0, // Manual upgrade
        status: 'ACTIVE'
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });

    if (user.geosurepathUserId) {
      await geosurepathService.updateUser(user.geosurepathUserId, { disabled: false });
    }

    logAction({
      adminId: req.user?.userId,
      userId,
      action: AUDIT_ACTIONS.UPGRADE_USER,
      details: { planId, deviceCount, extensionDays, newExpiry },
      ipAddress: req.ip
    });

    res.json({ message: 'User upgraded successfully.', subscription });
  } catch (error) {
    res.status(500).json({ error: 'Upgrade failed.' });
  }
};

exports.toggleHardlockBypass = async (req, res) => {
  const { userId, bypass } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { hardlockBypass: !!bypass }
    });

    logAction({
      adminId: req.user?.userId,
      userId,
      action: 'HARDLOCK_BYPASS',
      details: { bypass: !!bypass, email: user.email },
      ipAddress: req.ip
    });

    // ✅ SYNC: If bypass enabled, ensure Traccar user is enabled
    if (user.geosurepathUserId && bypass) {
        await geosurepathService.updateUser(user.geosurepathUserId, { disabled: false })
            .catch(e => console.error(`[AdminControl] Bypass sync failed for ${user.email}:`, e.message));
    } else if (user.geosurepathUserId && !bypass) {
        // Optional: If bypass disabled, we could trigger a re-eval, but the next login/cron will handle it.
        // For now, enabling is the most critical "Control" action.
    }

    res.json({ message: `Hardlock bypass ${bypass ? 'enabled' : 'disabled'} for ${user.email}`, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle hardlock bypass.' });
  }
};

/**
 * ✅ NEW: Resets MFA for a user (Administrative Recovery)
 */
exports.resetMFA = async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        mfaEnabled: false, 
        mfaSecret: null 
      }
    });

    logAction({
      adminId: req.user.userId,
      userId,
      action: AUDIT_ACTIONS.DISABLE_MFA,
      details: { email: user.email, reason: 'Administrative Reset' },
      ipAddress: req.ip
    });

    res.json({ message: `MFA has been successfully reset for ${user.email}.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset MFA.' });
  }
};

/**
 * ✅ NEW: Administrative Password Reset (S35/S36)
 * Synchronizes password reset between SaaS and Traccar Engine.
 */
exports.resetUserPassword = async (req, res) => {
  const { userId, newPassword } = req.body;
  
  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Valid userId and newPassword (min 6 chars) are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // 1. Hash and Update in SaaS
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        loginAttempts: 0,
        lockUntil: null
      }
    });

    // 2. Sync to GeoSurePath
    if (user.geosurepathUserId) {
      await geosurepathService.updateUser(user.geosurepathUserId, { password: newPassword })
        .catch(e => console.error(`[AdminResetSync] Engine sync failed for ${user.email}:`, e.message));
    }

    // 3. Clear all active sessions (Force re-login with new password)
    await prisma.refreshToken.deleteMany({ where: { userId } });

    logAction({
      adminId: req.user.userId,
      userId,
      action: AUDIT_ACTIONS.ADMIN_PASSWORD_RESET,
      details: { email: user.email, reason: 'Administrative Reset' },
      ipAddress: req.ip
    });

    res.json({ message: `Password successfully reset and sessions cleared for ${user.email}.` });
  } catch (error) {
    console.error('[resetUserPassword]', error);
    res.status(500).json({ error: 'Internal server error during password reset.' });
  }
};

exports.syncVehicleEvents = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { vehicles: { where: { deletedAt: null } } }
    });
    if (!user || user.vehicles.length === 0) return res.json({ message: 'No active vehicles to sync events for.' });

    const to = new Date();
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000); // Past 24 hours

    let totalEvents = 0;
    for (const vehicle of user.vehicles) {
      if (!vehicle.geosurepathDeviceId) continue;
      const events = await geosurepathService.getEvents(vehicle.geosurepathDeviceId, from, to);
      for (const ev of events) {
        await prisma.vehicleEvent.upsert({
          where: { id: String(ev.id) }, // Traccar IDs are unique
          update: {},
          create: {
            id: String(ev.id),
            vehicleId: vehicle.id,
            type: ev.type,
            message: ev.attributes?.message || ev.type,
            serverTime: new Date(ev.serverTime)
          }
        });
        totalEvents++;
      }
    }

    res.json({ message: `Successfully synchronized ${totalEvents} critical events from tracking engine.`, count: totalEvents });
  } catch (error) {
    console.error('[syncVehicleEvents]', error);
    res.status(500).json({ error: 'Failed to sync vehicle events.' });
  }
};

exports.clearAudit = async (req, res) => {
  try {
    const { count } = await prisma.auditLog.deleteMany({});
    
    logAction({
      adminId: req.user.userId,
      action: 'CLEAR_AUDIT_LOGS',
      details: `Administrative purge of all ${count} audit records.`,
      ipAddress: req.ip
    });

    res.json({ message: 'Audit trail purged successfully.', count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear audit trail.' });
  }
};

// ─── ULTRA-EDGE RECOVERY TOOLS (S41-S50) ───

exports.forceDebtSync = async (req, res) => {
  const { userId } = req.params;
  try {
    const { calculateBillForAnyUser } = require('./billingController');
    const bill = await calculateBillForAnyUser(userId);
    res.json({ message: 'Debt ledger recalculated and verified for parity.', bill });
  } catch (error) {
    res.status(500).json({ error: 'Force sync failed.' });
  }
};

exports.retryEnrollment = async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const gUser = await geosurepathService.createUser(user.name, user.email, password, { phone: user.phone });
    await prisma.user.update({ where: { id: userId }, data: { geosurepathUserId: gUser.id } });

    res.json({ message: 'Enrollment successfully recovered.', geosurepathUserId: gUser.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.transferVehicle = async (req, res) => {
  const { vehicleId } = req.params;
  const { targetUserId } = req.body;
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return res.status(404).json({ error: 'Target user not found.' });

    // 1. Unlink from old user in Traccar
    if (vehicle.geosurepathDeviceId && vehicle.userId) {
       const oldUser = await prisma.user.findUnique({ where: { id: vehicle.userId } });
       if (oldUser?.geosurepathUserId) {
          // Traccar /api/permissions is delete simple remove link
          await fetch(`${process.env.GEOSUREPATH_URL}/api/permissions`, {
             method: 'DELETE',
             headers: {
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(`${process.env.GEOSUREPATH_ADMIN_EMAIL}:${process.env.GEOSUREPATH_ADMIN_PASSWORD}`).toString('base64')
             },
             body: JSON.stringify({ userId: oldUser.geosurepathUserId, deviceId: vehicle.geosurepathDeviceId })
          }).catch(e => console.error('[Transfer] Unlink failed:', e.message));
       }
    }

    // 2. Link to new user in Traccar
    if (vehicle.geosurepathDeviceId && targetUser.geosurepathUserId) {
       await geosurepathService.linkDeviceToUser(targetUser.geosurepathUserId, vehicle.geosurepathDeviceId);
    }

    // 3. Update SaaS Ownership
    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { 
        userId: targetUserId,
        registrationDate: new Date() // Reset billing starting from today for new owner
      }
    });

    logAction({
      adminId: req.user.userId,
      action: 'VEHICLE_TRANSFER',
      details: `Transferred IMEI ${vehicle.imei} from User ${vehicle.userId} to ${targetUserId}`,
      ipAddress: req.ip
    });

    res.json({ message: 'Ownership transferred successfully.', vehicle: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkDbHealth = async (req, res) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    // Check connection pool by running a few concurrent queries (S201)
    const [userCount, deviceCount] = await Promise.all([
      prisma.user.count(),
      prisma.vehicle.count()
    ]);

    res.json({
      status: 'healthy',
      latency: `${latency}ms`,
      stats: { users: userCount, devices: deviceCount },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
};

exports.updateUserRegion = async (req, res) => {
  const { userId } = req.params;
  const { region } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { region }
    });
    res.json({ message: 'User region updated.', user: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAuditLogsExport = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
      take: 5000 
    });

    const exportData = logs.map(l => ({
      timestamp: l.createdAt,
      adminId: l.adminId,
      user: l.user?.name || l.userId,
      userEmail: l.user?.email,
      action: l.action,
      details: l.details,
      ip: l.ipAddress
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_logs_export.json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'Export failed: ' + error.message });
  }
};

// --- AIS 140 GOVERNMENT COMPLIANCE (NEW) ---

/**
 * Get all vehicles marked as AIS 140 for specialized management
 */
exports.getAIS140Inventory = async (req, res) => {
    try {
        const vehicles = await prisma.vehicle.findMany({
            where: { isAIS140: true },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch AIS 140 inventory.' });
    }
};

/**
 * Update RTO Approval status and Certificate details
 */
exports.updateRTOApproval = async (req, res) => {
    const { vehicleId, status, certNumber, expiryDate } = req.body;
    
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid RTO status.' });
    }

    try {
        const vehicle = await prisma.vehicle.update({
            where: { id: vehicleId },
            data: {
                approvalStatus: status,
                certNumber: certNumber || undefined,
                ais140Expiry: expiryDate ? new Date(expiryDate) : undefined
            }
        });

        logAction({
            adminId: req.user.userId,
            action: 'AIS140_RTO_APPROVAL',
            details: `Updated vehicle ${vehicle.imei} to ${status}. Cert: ${certNumber}`,
            ipAddress: req.ip
        });

        res.json({ message: 'RTO approval status updated successfully.', vehicle });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update RTO approval.' });
    }
};

/**
 * Configure Government Data Forwarding
 */
exports.configureAIS140Forwarding = async (req, res) => {
    const { vehicleId, endpoint, enabled } = req.body;

    try {
        const vehicle = await prisma.vehicle.update({
            where: { id: vehicleId },
            data: {
                governmentEndpoint: endpoint || undefined,
                forwardingEnabled: !!enabled
            }
        });

        logAction({
            adminId: req.user.userId,
            action: 'AIS140_FORWARDING_CONFIG',
            details: `Forwarding for ${vehicle.imei} set to ${enabled}. Endpoint: ${endpoint}`,
            ipAddress: req.ip
        });

        res.json({ message: 'Government forwarding configuration saved.', vehicle });
    } catch (error) {
        res.status(500).json({ error: 'Failed to configure data forwarding.' });
    }
};

// NEW: Mass Re-Sync All Users to Tracking Engine
exports.massSyncUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { deletedAt: null, role: { in: ['CLIENT', 'MANAGER'] } },
            select: { id: true, email: true, name: true, isActive: true, geosurepathUserId: true }
        });

        const results = {
            total: users.length,
            synced: 0,
            failed: 0,
            errors: []
        };

        for (const user of users) {
            try {
                let gUserId = user.geosurepathUserId;
                
                // 1. If missing engine ID, search by email
                if (!gUserId) {
                    const engineUser = await geosurepathService.getUserByEmail(user.email);
                    if (engineUser) {
                        gUserId = engineUser.id;
                        await prisma.user.update({ where: { id: user.id }, data: { geosurepathUserId: gUserId } });
                    }
                }

                if (gUserId) {
                    // 2. Update existing user (Sync status)
                    await geosurepathService.updateUser(gUserId, { name: user.name, disabled: !user.isActive });
                } else {
                    // 3. Re-create missing user (Use a temporary password or reset later)
                    // Note: Since we don't have the plaintext password here, we create with a placeholder 
                    // and rely on the next login's "Self-Healing" to fix it.
                    const newGUser = await geosurepathService.createUser(user.name, user.email, 'GSP_RECOVERY_123');
                    await prisma.user.update({ where: { id: user.id }, data: { geosurepathUserId: newGUser.id } });
                }
                
                results.synced++;
            } catch (err) {
                results.failed++;
                results.errors.push({ email: user.email, error: err.message });
            }
        }

        logAction({
            adminId: req.user.userId,
            action: AUDIT_ACTIONS.MASS_SYNC_PERFORMED,
            details: { synced: results.synced, failed: results.failed },
            ipAddress: req.ip
        });

        res.json({ message: 'Mass synchronization complete.', results });
    } catch (error) {
        console.error('[MassSync] Fatal:', error);
        res.status(500).json({ error: 'Mass synchronization process failed.' });
    }
};

// ✅ NEW: Get Pending Upgrades — users requiring manual admin attention
// Returns expired subscriptions, overdue accounts, and users without subscriptions.
exports.getPendingUpgrades = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: { deletedAt: null, role: 'CLIENT' },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true }
        },
        vehicles: { where: { deletedAt: null }, select: { id: true } },
        payments: {
          where: { status: 'CAPTURED' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const noSubscription = [];
    const expired = [];
    const nearlyExpired = [];

    for (const user of users) {
      const sub = user.subscriptions[0];
      const vehicleCount = user.vehicles.length;
      const lastPayment = user.payments[0];

      const base = {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        vehicleCount,
        lastPaymentDate: lastPayment?.createdAt || null,
        lastPaymentAmount: lastPayment?.amount || 0
      };

      if (!sub) {
        noSubscription.push({ ...base, status: 'NO_SUBSCRIPTION' });
        continue;
      }

      const expiryDate = new Date(sub.expiresAt);

      if (expiryDate < now) {
        expired.push({ ...base, expiryDate, planName: sub.plan?.name || 'Unknown', daysOverdue: Math.ceil((now - expiryDate) / (1000 * 60 * 60 * 24)), status: 'EXPIRED' });
      } else if (expiryDate < sevenDaysFromNow) {
        nearlyExpired.push({ ...base, expiryDate, planName: sub.plan?.name || 'Unknown', daysUntilExpiry: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)), status: 'NEARLY_EXPIRED' });
      }
    }

    res.json({
      summary: {
        noSubscription: noSubscription.length,
        expired: expired.length,
        nearlyExpired: nearlyExpired.length,
        total: noSubscription.length + expired.length + nearlyExpired.length
      },
      noSubscription,
      expired,
      nearlyExpired
    });
  } catch (error) {
    console.error('[getPendingUpgrades]', error);
    res.status(500).json({ error: 'Failed to fetch pending upgrades.' });
  }
};

/**
 * ✅ RESTORATION & RECOVERY SUITE (S501+)
 * Ensures "Perfect Synchronization" during backup recovery or accidental deletion events.
 */

// 1. Restore a soft-deleted user (Back from the dead)
exports.restoreDeletedUser = async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null, isActive: true }
    });

    // Re-enable in tracking engine
    if (user.geosurepathUserId) {
      await geosurepathService.updateUser(user.geosurepathUserId, { disabled: false })
        .catch(e => console.error(`[RecoverySync] User ${user.email} engine enable failed:`, e.message));
    }

    logAction({
      adminId: req.user.userId,
      userId,
      action: 'RECOVERY_USER_RESTORED',
      details: { email: user.email },
      ipAddress: req.ip
    });

    res.json({ message: 'User restoration and engine synchronization complete.', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore user.' });
  }
};

// 2. Force Engine Re-Sync (The "Nuclear" Recovery Option)
// Wipes and recreates the Traccar user from SaaS data to resolve corruption/desync.
exports.forceUserReSync = async (req, res) => {
  const { userId, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Wipe existing Traccar ID to trigger recreation logic
    if (user.geosurepathUserId) {
      await geosurepathService.deleteUser(user.geosurepathUserId).catch(() => {});
    }

    // Re-Create in Engine
    const gUser = await geosurepathService.createUser(user.name, user.email, newPassword || 'GeoSure@2026', {
      disabled: !user.isActive
    });

    await prisma.user.update({
      where: { id: userId },
      data: { geosurepathUserId: gUser.id }
    });

    logAction({
      adminId: req.user.userId,
      userId,
      action: 'RECOVERY_ENGINE_RESYNC',
      details: { oldId: user.geosurepathUserId, newId: gUser.id },
      ipAddress: req.ip
    });

    res.json({ message: 'Tracking engine successfully re-synchronized with SaaS database.', engineId: gUser.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to force engine re-sync.' });
  }
};
