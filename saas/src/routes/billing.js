const express = require('express');
const router = express.Router();
const { 
    getMyBill, adminUpdateRegistration, settleCash, 
    getAdminAnalytics, getAllUsersLedger, updateGatewayConfig, updatePlan 
} = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/my-bill', authenticateToken, getMyBill);
router.get('/admin-analytics', authenticateToken, getAdminAnalytics);
router.get('/admin/ledger', authenticateToken, getAllUsersLedger);
router.post('/admin/update-registration', authenticateToken, adminUpdateRegistration);
router.post('/admin/settle-cash', authenticateToken, settleCash);
router.post('/admin/config-gateway', authenticateToken, updateGatewayConfig);
router.post('/admin/update-plan', authenticateToken, updatePlan);

module.exports = router;