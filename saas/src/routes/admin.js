// src/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
// Ensure all routes below belong to ADMIN only
router.use(requireRole('ADMIN'));

router.get('/health', adminController.getSystemHealth);
router.get('/stats', adminController.getStats);
router.get('/advanced-stats', adminController.getAdvancedStats);
router.get('/audit-logs', adminController.getAuditLogs);

// User Management
router.get('/users', adminController.getAllUsers);
router.post('/client-status', adminController.updateClientStatus);
router.post('/bulk-status', adminController.bulkUpdateStatus);
router.post('/bulk-delete', adminController.bulkDeleteUsers);
router.post('/adjust-expiry', adminController.adjustExpiry);
router.post('/users', adminController.createUser);
router.post('/users/role', adminController.updateUserRole);
router.post('/users/bulk-devices', adminController.bulkCreateDevices);

// Sovereign Management
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);
router.get('/health/full', adminController.getFullStatus);
router.post('/user-subscription', adminController.updateUserSubscription);
router.get('/users/:userId/sessions', adminController.getUserSessions);
router.post('/users/:userId/sessions/:sessionId/revoke', adminController.revokeUserSession);

// Plan Management
router.get('/plans', adminController.getPlans);
router.post('/plans', adminController.createPlan);
router.put('/plans', adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);

// NEW: Impersonation
router.post('/impersonate', authenticateToken, requireRole('ADMIN'), adminController.impersonateUser);
router.post('/exit-impersonation', authenticateToken, adminController.exitImpersonation);

module.exports = router;