// saas/src/routes/webhooks.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const billingController = require('../controllers/billingController');

// Razorpay Webhook (Public)
router.post('/razorpay', billingController.handleWebhook);

// Traccar Lifecycle Webhook (Internal/Trusted)
router.post('/traccar/lifecycle', webhookController.handleTraccarLifecycle);

module.exports = router;
