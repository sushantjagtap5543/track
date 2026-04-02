// src/routes/admin.js
// ✅ UPGRADED: All admin routes consolidated. New routes: db-health, pending-upgrades.

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const billingController = require('../controllers/billingController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// ─── SYSTEM HEALTH & STATUS ──────────────────────────────────────────────────
router.get('/health',            adminController.getSystemHealth);
router.get('/health/full',       adminController.getFullStatus);
router.get('/db-health',         adminController.checkDbHealth);     // ✅ NEW: was missing

// ─── STATISTICS & ANALYTICS ──────────────────────────────────────────────────
router.get('/stats',             adminController.getStats);
router.get('/overview',          billingController.getDashboardOverview); // ✅ ALIAS for frontend
router.get('/dashboard-overview', billingController.getDashboardOverview); // ✅ Clean path
router.get('/advanced-stats',    adminController.getAdvancedStats);
router.get('/payments',          billingController.getAllPayments);
router.get('/pending-upgrades',  adminController.getPendingUpgrades);

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
router.get('/audit-logs',        adminController.getAuditLogs);
router.post('/audit/clear',      adminController.clearAudit);
router.get('/audit-export',      adminController.getAuditLogsExport);

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────
router.get('/users',                               adminController.getAllUsers);
router.get('/ledger',                              billingController.getAllUsersLedger); // ✅ ALIAS for frontend
router.post('/users',                              adminController.createUser);
router.post('/client-status',                      adminController.updateClientStatus);
router.post('/bulk-status',                        adminController.bulkUpdateStatus);
router.post('/bulk-delete',                        adminController.bulkDeleteUsers);
router.post('/adjust-expiry',                      adminController.adjustExpiry);
router.post('/users/role',                         adminController.updateUserRole);
router.post('/users/bulk-devices',                 adminController.bulkCreateDevices);
router.delete('/users/:userId',                    adminController.deleteUser);
router.post('/sync-devices/:userId',               adminController.syncDevicesForUser);
router.post('/users/:userId/sync-events',          adminController.syncVehicleEvents);
router.post('/users/:userId/region',               adminController.updateUserRegion);
router.post('/users/:userId/force-debt-sync',      adminController.forceDebtSync);
router.post('/users/:userId/retry-enrollment',     adminController.retryEnrollment);
router.post('/users/:userId/upgrade',              adminController.upgradeUser);
router.get('/users/expiry-status',                 adminController.getUsersExpiryStatus);
router.get('/users/:userId/sessions',              adminController.getUserSessions);
router.post('/users/:userId/sessions/:sessionId/revoke', adminController.revokeUserSession);
router.post('/users/:userId/revoke-all-sessions',  adminController.revokeAllUserSessions);
router.post('/users/hardlock-bypass',              adminController.toggleHardlockBypass);
router.post('/users/reset-mfa',                  adminController.resetMFA);
router.post('/users/:userId/reset-password',             adminController.resetUserPassword);
router.post('/users/:userId/restore',                    adminController.restoreDeletedUser);
router.post('/users/:userId/force-resync',               adminController.forceUserReSync);

// ─── SUBSCRIPTION MANAGEMENT ─────────────────────────────────────────────────
router.post('/user-subscription',                  adminController.updateUserSubscription);

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
router.get('/settings',          adminController.getSettings);
router.post('/settings',         adminController.updateSettings);

// ─── PLAN MANAGEMENT ─────────────────────────────────────────────────────────
router.get('/plans',             adminController.getPlans);
router.post('/plans',            adminController.createPlan);
router.put('/plans',             adminController.updatePlan);
router.delete('/plans/:id',      adminController.deletePlan);

// ─── AIS 140 GOVERNMENT COMPLIANCE ──────────────────────────────────────────
router.get('/ais140-inventory',   adminController.getAIS140Inventory);
router.post('/ais140-approval',   adminController.updateRTOApproval);
router.post('/ais140-forwarding', adminController.configureAIS140Forwarding);

// ─── SERVICES ────────────────────────────────────────────────────────────────
router.get('/services',                     adminController.getServices);
router.post('/services',                    adminController.createService);
router.put('/services',                     adminController.updateService);
router.delete('/services/:id',              adminController.deleteService);

// ─── USER SERVICE PROVISIONING ───────────────────────────────────────────────
router.post('/provision-service',           adminController.provisionService);
router.post('/deprovision-service',         adminController.deprovisionService);
router.get('/users/:userId/services',       adminController.getUserServicesForAdmin);

// ─── VEHICLE MANAGEMENT ──────────────────────────────────────────────────────
router.post('/vehicles/:vehicleId/transfer', adminController.transferVehicle);

// ─── SYNCHRONIZATION TOOLS ───────────────────────────────────────────────────
router.post('/sync-all-devices',  adminController.syncAllDevices);
router.post('/sync/mass',         adminController.massSyncUsers);

// ─── IMPERSONATION ───────────────────────────────────────────────────────────
router.post('/impersonate',          adminController.impersonateUser);
router.post('/exit-impersonation',   adminController.exitImpersonation);

module.exports = router;