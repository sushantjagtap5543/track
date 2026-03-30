// src/controllers/adminController.js
// ✅ FIX: Use shared Prisma singleton instead of `new PrismaClient()`.

const os = require('os');
const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const geosurepathService = require('../services/geosurepath');
const analyticsService = require('../services/analyticsService');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);
const { logAction, AUDIT_ACTIONS } = require('../services/auditService');

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
    logAction({
      adminId: req.user.userId,
      userId: userId,
      action: AUDIT_ACTIONS.EXTEND_GRACE,
      details: { extensionDays, newExpiry: newGraceDate },
      ipAddress: req.ip
    });

    res.json({ message: `VIP Override active. Account secured for another ${extensionDays} days.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to adjust expiry.' });
  }
};

// NEW: Get Admin Settings (Masked)
exports.getSettings = async (req, res) => {
  try {
    const settings = await prisma.adminSetting.upsert({
      where: { id: 'GLOBAL' },
      update: {},
      create: { id: 'GLOBAL' }
    });

    const masked = {
      paymentLink: settings.paymentLink || '',
      razorpayId: settings.razorpayId ? '••••••••' : '',
      razorpaySecret: settings.razorpaySecret ? '••••••••' : '',
      razorpayWebhookSecret: settings.razorpayWebhookSecret ? '••••••••' : '',
      firebaseConfig: settings.firebaseConfig ? '••••••••' : '',
      openrouterKey: settings.openrouterKey ? '••••••••' : '',
      supportEmail: settings.supportEmail || ''
    };

    res.json(masked);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// NEW: Update Admin Settings
exports.updateSettings = async (req, res) => {
  const { paymentLink, razorpayId, razorpaySecret, razorpayWebhookSecret, firebaseConfig, openrouterKey, supportEmail } = req.body;

  try {
    const data = {};
    if (paymentLink !== undefined) data.paymentLink = paymentLink;
    if (razorpayId && razorpayId !== '••••••••') data.razorpayId = razorpayId;
    if (razorpaySecret && razorpaySecret !== '••••••••') data.razorpaySecret = razorpaySecret;
    if (razorpayWebhookSecret && razorpayWebhookSecret !== '••••••••') data.razorpayWebhookSecret = razorpayWebhookSecret;
    if (firebaseConfig && firebaseConfig !== '••••••••') data.firebaseConfig = firebaseConfig;
    if (openrouterKey && openrouterKey !== '••••••••') data.openrouterKey = openrouterKey;
    if (supportEmail !== undefined) data.supportEmail = supportEmail;
    
    data.updatedBy = req.user.userId;

    await prisma.adminSetting.update({
      where: { id: 'GLOBAL' },
      data
    });

    res.json({ message: 'Sovereign Configuration Updated Successfully' });

    // Audit Log
    logAction({
      adminId: req.user.userId,
      action: AUDIT_ACTIONS.UPDATE_GLOBAL_SETTINGS,
      details: { updatedKeys: Object.keys(data) },
      ipAddress: req.ip
    });

  } catch (error) {
    res.status(500).json({ error: 'Configuration update failed' });
  }
};

// NEW: Manual User Subscription Update
exports.updateUserSubscription = async (req, res) => {
  const { userId, planId, status, expiresAt } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updateData = {};
    if (status) updateData.status = status;
    if (planId) updateData.planId = planId;
    if (expiresAt) updateData.expiresAt = new Date(expiresAt);

    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData
      });
    } else if (planId && expiresAt) {
      // Create new if none exists
      await prisma.subscription.create({
        data: {
          userId,
          planId,
          status: status || 'ACTIVE',
          expiresAt: new Date(expiresAt),
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

// NEW: Enhanced System Status
exports.getFullStatus = async (req, res) => {
  try {
    // Check DB Status
    const dbStatus = await prisma.$queryRaw`SELECT 1`.then(() => 'online').catch(() => 'offline');
    
    // Check Traccar API
    const traccarStatus = await geosurepathService.getAllDevices().then(() => 'online').catch(() => 'offline');

    // System stats (Host-level view from container)
    const stats = {
      cpu: os.loadavg(),
      memory: {
        total: (os.totalmem() / 1e9).toFixed(2) + ' GB',
        free: (os.freemem() / 1e9).toFixed(2) + ' GB',
      },
      uptime: os.uptime(),
      db: dbStatus,
      traccar: traccarStatus,
      node: process.version,
      platform: os.platform()
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'System monitoring failed' });
  }
};

// Manage Billing Plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { pricePerDevice: 'asc' } });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

exports.updatePlan = async (req, res) => {
  const { id, name, description, pricePerDevice, billingCycle } = req.body;
  try {
    const plan = await prisma.plan.update({
      where: { id },
      data: { name, description, pricePerDevice, billingCycle }
    });
    res.json(plan);

    // Audit Log
    logAction({
        adminId: req.user.userId,
        action: AUDIT_ACTIONS.UPDATE_BILLING_PLAN,
        details: { id, name, pricePerDevice, billingCycle },
        ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
};

exports.createPlan = async (req, res) => {
  const { name, description, pricePerDevice, billingCycle } = req.body;
  try {
    const plan = await prisma.plan.create({
      data: { name, description, pricePerDevice, billingCycle }
    });
    res.json(plan);

    // Audit Log
    logAction({
        adminId: req.user.userId,
        action: AUDIT_ACTIONS.CREATE_BILLING_PLAN,
        details: { name, pricePerDevice, billingCycle },
        ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
};

exports.deletePlan = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.plan.delete({ where: { id } });
    res.json({ message: 'Plan deleted successfully' });

    // Audit Log
    logAction({
        adminId: req.user.userId,
        action: AUDIT_ACTIONS.DELETE_BILLING_PLAN,
        details: { planId: id },
        ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan' });
  }
};

// NEW: Impersonation Engine (Ghosting)
exports.impersonateUser = async (req, res) => {
  const { userId } = req.body;
  try {
    const targetUser = await prisma.user.findUnique({ 
        where: { id: userId },
        include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Ensure we don't impersonate another admin (security measure)
    if (targetUser.role === 'ADMIN') return res.status(403).json({ error: 'Cannot impersonate another administrator.' });

    // Generate tokens for the target user but keep track of who did it
    const accessToken = jwt.sign(
      { 
        userId: targetUser.id, 
        role: targetUser.role, 
        geosurepathUserId: targetUser.geosurepathUserId,
        isGhost: true,
        impersonatedBy: req.user.userId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Short duration for ghost sessions
    );

    res.json({ accessToken, user: targetUser });

    // Audit Log
    logAction({
      adminId: req.user.userId,
      userId: targetUser.id,
      action: AUDIT_ACTIONS.GHOST_USER_SESSION,
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
            action: AUDIT_ACTIONS.EXIT_GHOST_SESSION,
            details: { message: 'Admin exited ghost session' },
            ipAddress: req.ip
        });

        res.json({ message: 'Ghost session terminated. Returning to sovereign authority.' });
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
      subject: 'Welcome to GeoSurePath - Sovereign Onboarding',
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
    for (const dev of devices) {
        try {
            // 1. Create in GeoSurePath
            const gDevice = await geosurepathService.createDevice(dev.name, dev.uniqueId);
            // 2. Link to User
            await geosurepathService.linkDeviceToUser(user.geosurepathUserId, gDevice.id);
            results.push({ name: dev.name, status: 'success', id: gDevice.id });
        } catch (err) {
            results.push({ name: dev.name, status: 'error', error: err.message });
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

// NEW: Administrative Session Termination
exports.revokeUserSession = async (req, res) => {
  const { userId, sessionId } = req.params;
  try {
    await prisma.refreshToken.delete({
      where: { id: sessionId, userId }
    });
    res.json({ message: 'User session successfully terminated by administrator.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate user session.' });
  }
};
