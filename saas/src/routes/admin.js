// src/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const billingController = require('../controllers/billingController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
// Ensure all routes below belong to ADMIN only
router.use(requireRole('ADMIN'));

router.get('/health', adminController.getSystemHealth);
router.get('/stats', adminController.getStats);
router.get('/advanced-stats', adminController.getAdvancedStats);
router.get('/audit-logs', adminController.getAuditLogs);
router.post('/audit/clear', adminController.clearAudit);
router.get('/payments', billingController.getAllPayments);

// User Management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.post('/client-status', adminController.updateClientStatus);
router.post('/bulk-status', adminController.bulkUpdateStatus);
router.post('/bulk-delete', adminController.bulkDeleteUsers);
router.post('/adjust-expiry', adminController.adjustExpiry);
router.post('/users/role', adminController.updateUserRole);
router.post('/users/bulk-devices', adminController.bulkCreateDevices);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/sync-devices/:userId', adminController.syncDevicesForUser);
router.post('/users/:userId/sync-events', adminController.syncVehicleEvents);
router.post('/vehicles/:vehicleId/transfer', adminController.transferVehicle); 
router.get('/audit-export', adminController.getAuditLogsExport);
router.post('/users/:userId/region', adminController.updateUserRegion);
router.post('/users/:userId/force-debt-sync', adminController.forceDebtSync);
router.post('/users/:userId/retry-enrollment', adminController.retryEnrollment);
router.post('/sync-all-devices', adminController.syncAllDevices);

// Administrative Management
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.updateSettings);
router.get('/health/full', adminController.getFullStatus);
router.post('/user-subscription', adminController.updateUserSubscription);
router.get('/users/:userId/sessions', adminController.getUserSessions);
router.post('/users/:userId/sessions/:sessionId/revoke', adminController.revokeUserSession);
router.post('/users/:userId/revoke-all-sessions', adminController.revokeAllUserSessions);
router.get('/users/expiry-status', adminController.getUsersExpiryStatus);
router.post('/users/:userId/upgrade', adminController.upgradeUser);
router.post('/users/hardlock-bypass', adminController.toggleHardlockBypass);

// Plan Management
router.get('/plans', adminController.getPlans);
router.post('/plans', adminController.createPlan);
router.put('/plans', adminController.updatePlan);
router.delete('/plans/:id', adminController.deletePlan);

// --- SERVICES (NEW) ---
router.get('/services', adminController.getServices);
router.post('/services', adminController.createService);
router.put('/services', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

// --- USER PROVISIONING (NEW) ---
router.post('/provision-service', adminController.provisionService);
router.post('/deprovision-service', adminController.deprovisionService);
router.get('/users/:userId/services', adminController.getUserServicesForAdmin);

// Impersonation
router.post('/impersonate', adminController.impersonateUser);
router.post('/exit-impersonation', adminController.exitImpersonation);

module.exports = router;