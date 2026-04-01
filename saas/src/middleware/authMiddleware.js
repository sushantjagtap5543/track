// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // ✅ SESSION HIJACKING PROTECTION (S121-130)
    // Verify that the User-Agent requesting this resource matches the one that logged in.
    const crypto = require('crypto');
    const incomingUAHash = crypto.createHash('md5').update(req.headers['user-agent'] || '').digest('hex');
    if (decoded.uaHash && decoded.uaHash !== incomingUAHash) {
       return res.status(403).json({ error: 'Security Alert: Session mismatch. Please login again.' });
    }

    try {
      const redis = require('../lib/redis');
      let cachedUser = await redis.get(`user_session:${decoded.userId}`);
      let user;

      if (cachedUser) {
        user = JSON.parse(cachedUser);
      } else {
        user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
        if (user) {
          await redis.set(`user_session:${decoded.userId}`, JSON.stringify(user), 'EX', 300); // 5 minute cache
        }
      }

      if (!user || !user.isActive) {
        return res.status(403).json({ error: 'User account is inactive or not found' });
      }

      // ✅ HARDLOCK CHECK: Block access if subscription is OVERDUE
      // EXCEPTION: Allow billing routes so the user can pay to regain access
      const isBillingRoute = req.originalUrl && req.originalUrl.includes('/api/billing');

      if (user.role === 'CLIENT' && !isBillingRoute) {
        const latestSub = await prisma.subscription.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          include: { plan: true }
        });

        const redisConn = require('../lib/redis');
        const now = new Date();
        let effectiveExpiry = latestSub?.expiresAt ? new Date(latestSub.expiresAt) : new Date(user.registrationDate);
        if (user.graceExtensionUntil && new Date(user.graceExtensionUntil) > effectiveExpiry) {
          effectiveExpiry = new Date(user.graceExtensionUntil);
        }

        // Dynamic Grace Period
        let planDays = 30;
        if (latestSub?.plan) {
          planDays = latestSub.plan.billingCycle === 'MONTHLY' ? 30 : 365;
          if (latestSub.planId?.toLowerCase().includes('half') || latestSub.plan.name?.toLowerCase().includes('6 month')) {
            planDays = 180;
          }
        }

        let gracePeriod = 7;
        if (planDays <= 31) gracePeriod = 3;
        else if (planDays <= 186) gracePeriod = 5;
        else gracePeriod = 7;

        const gracePeriodEnd = new Date(effectiveExpiry);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriod);

        const isBypassed = user.hardlockBypass || false;
        const isHardlocked = now > gracePeriodEnd && !isBypassed;

        if (isHardlocked) {
          return res.status(403).json({ 
            error: `Subscription Overdue: Access blocked. Your current grace period was ${gracePeriod} days. Please pay your outstanding dues.`,
            isHardlocked: true
          });
        }
      }

      req.user = { 
        ...decoded, 
        role: user.role,
        isGhost: decoded.isGhost || false,
        impersonatedBy: decoded.impersonatedBy || null
      };
      next();
    } catch (dbErr) {
      console.error('[AuthMiddleware] DB Error:', dbErr);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }
    next();
  };
};

/**
 * ✅ NEW: requireAnyRole — Allow multiple roles to access a route.
 * Usage: requireAnyRole('ADMIN', 'MANAGER')
 */
const requireAnyRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAnyRole
};