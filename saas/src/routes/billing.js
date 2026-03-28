// src/routes/billing.js
// ✅ FIX: Admin-only billing routes now use `requireRole('ADMIN')` middleware for
//    defense-in-depth. Previously, only the controller functions checked `req.user.role`,
//    meaning a bug in any one controller could expose admin data to regular users.

const express = require('express');
const router = express.Router();
const {
  getMyBill,
  adminUpdateRegistration,
  settleCash,
  getAdminAnalytics,
  getAllUsersLedger,
  updateGatewayConfig,
  updatePlan
} = require('../controllers/billingController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Client routes (any authenticated user)
router.get('/my-bill', authenticateToken, getMyBill);

// Admin routes — protected by both token AND role middleware
router.get('/admin-analytics', authenticateToken, requireRole('ADMIN'), getAdminAnalytics);
router.get('/admin/ledger', authenticateToken, requireRole('ADMIN'), getAllUsersLedger);
router.post('/admin/update-registration', authenticateToken, requireRole('ADMIN'), adminUpdateRegistration);
router.post('/admin/settle-cash', authenticateToken, requireRole('ADMIN'), settleCash);
router.post('/admin/config-gateway', authenticateToken, requireRole('ADMIN'), updateGatewayConfig);
router.post('/admin/update-plan', authenticateToken, requireRole('ADMIN'), updatePlan);

module.exports = router;