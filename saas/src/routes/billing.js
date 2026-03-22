// src/routes/billing.js
const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Create order for Razorpay checkout
router.post('/create-order', billingController.createOrder);

// Verify payment
router.post('/verify', billingController.verifyPayment);

// Get current subscription
router.get('/subscription', billingController.getSubscription);

// Get payment history
router.get('/history', billingController.getPayments);

module.exports = router;
