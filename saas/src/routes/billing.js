// src/routes/billing.js
// ✅ UPGRADED: Full admin billing suite with pagination, refunds, revenue reports, bulk settle, dashboard overview.

const express = require('express');
const router = express.Router();
const {
  getMyBill,
  adminUpdateRegistration,
  settleCash,
  getAdminAnalytics,
  getAllUsersLedger,
  updateGatewayConfig,
  updatePlan,
  createOrder,
  demoSettle,
  handleWebhook,
  verifyPayment,
  getAIInsights,
  getAllPayments,
  // ✅ NEW admin billing endpoints
  getAllPaymentsAdmin,
  getPaymentsByUser,
  refundPayment,
  getRevenueReport,
  bulkSettleCash,
  getDashboardOverview
} = require('../controllers/billingController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { billingLimiter } = require('../middleware/rateLimiter');

// ─── CLIENT ROUTES (any authenticated user) ──────────────────────────────────
router.get('/my-bill', authenticateToken, getMyBill);
router.post('/demo-settle', authenticateToken, demoSettle);
router.post('/create-order', authenticateToken, billingLimiter, createOrder);
router.post('/verify', authenticateToken, billingLimiter, verifyPayment);

// ─── WEBHOOK (Public, signature verified in controller) ──────────────────────
router.post('/webhook', handleWebhook);

// ─── ADMIN ROUTES — protected by token AND ADMIN role ────────────────────────
router.get('/admin-analytics',              authenticateToken, requireRole('ADMIN'), getAdminAnalytics);
router.get('/admin/ledger',                 authenticateToken, requireRole('ADMIN'), getAllUsersLedger);
router.get('/admin/dashboard-overview',     authenticateToken, requireRole('ADMIN'), getDashboardOverview);
router.get('/admin/revenue-report',         authenticateToken, requireRole('ADMIN'), getRevenueReport);
router.get('/admin/ai-insights',            authenticateToken, requireRole('ADMIN'), getAIInsights);

// Payments — paginated + filterable
router.get('/admin/payments',               authenticateToken, requireRole('ADMIN'), getAllPaymentsAdmin);
router.get('/admin/payments/legacy',        authenticateToken, requireRole('ADMIN'), getAllPayments);   // backwards-compat raw list
router.get('/admin/payments/:userId',       authenticateToken, requireRole('ADMIN'), getPaymentsByUser);

// Refunds
router.post('/admin/refund',                authenticateToken, requireRole('ADMIN'), refundPayment);

// Settlement
router.post('/admin/settle-cash',           authenticateToken, requireRole('ADMIN'), settleCash);
router.post('/admin/bulk-settle',           authenticateToken, requireRole('ADMIN'), bulkSettleCash);

// Config & Plans
router.post('/admin/config-gateway',        authenticateToken, requireRole('ADMIN'), updateGatewayConfig);
router.post('/admin/update-plan',           authenticateToken, requireRole('ADMIN'), updatePlan);
router.post('/admin/update-registration',   authenticateToken, requireRole('ADMIN'), adminUpdateRegistration);

module.exports = router;