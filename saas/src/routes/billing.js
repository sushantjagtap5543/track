const express = require('express');
const router = express.Router();
const { getMyBill, adminUpdateRegistration } = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/my-bill', authenticateToken, getMyBill);
router.post('/admin/update-registration', authenticateToken, adminUpdateRegistration);

module.exports = router;