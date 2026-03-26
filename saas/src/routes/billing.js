const express = require('express');
const router = express.Router();
const { getMyBill, adminUpdateRegistration, settleCash, getAdminAnalytics } = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/my-bill', authenticateToken, getMyBill);
router.get('/admin-analytics', authenticateToken, getAdminAnalytics);
router.post('/admin/update-registration', authenticateToken, adminUpdateRegistration);
router.post('/admin/settle-cash', authenticateToken, settleCash);

module.exports = router;