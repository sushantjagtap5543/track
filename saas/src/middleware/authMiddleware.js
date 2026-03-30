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

    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.isActive) {
        return res.status(403).json({ error: 'User account is inactive or not found' });
      }

      // Optional: Check if user is verified for certain routes
      // if (!user.isVerified) { ... }

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

module.exports = {
  authenticateToken,
  requireRole
};