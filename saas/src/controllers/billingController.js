// src/controllers/billingController.js
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const geosurepathService = require('../services/geosurepath');
const prisma = new PrismaClient();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxx',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_xxxx'
});

// Create a new order
exports.createOrder = async (req, res) => {
  const { planId, deviceCount } = req.body; 

  try {
    // 1. Fetch Plan details from DB
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // 2. Calculate Total Amount
    const totalAmount = plan.pricePerDevice * (deviceCount || 1);

    const options = {
      amount: totalAmount * 100, // paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    // Track payment intent in DB
    await prisma.payment.create({
      data: {
        userId: req.user.userId,
        amount: totalAmount,
        status: 'CREATED',
        transactionId: order.id
      }
    });

    res.json(order);
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

// Verify payment signature
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret_xxxx')
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    // Update payment status
    await prisma.payment.updateMany({
      where: { transactionId: razorpay_order_id },
      data: { status: 'COMPLETED', paymentMethod: 'RAZORPAY' }
    });

    // Create or renew subscription
    const payment = await prisma.payment.findFirst({
      where: { transactionId: razorpay_order_id }
    });

    // Determine plan type (from metadata or passed planId)
    const plan = await prisma.plan.findUnique({
      where: { id: planId || 'STANDARD_PLAN' }
    });

    // Set expiration based on plan cycle
    const expiresAt = new Date();
    if (plan?.billingCycle === 'YEARLY') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    await prisma.subscription.create({
      data: {
        userId: req.user.userId,
        status: 'ACTIVE',
        planId: planId || (plan?.id),
        price: payment?.amount || 0,
        deviceCount: req.body.deviceCount || 1,
        expiresAt: expiresAt
      }
    });

    // Ensure user account is active
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { isActive: true }
    });

    // Sync with Traccar engine
    if (user.geosurepathUserId) {
        try {
            await geosurepathService.updateUser(user.geosurepathUserId, { disabled: false });
            console.log(`[Sync] User ${user.email} re-activated in Traccar after payment.`);
        } catch (syncError) {
            console.error(`[Sync Error] Failed to re-activate ${user.email} in Traccar:`, syncError.message);
        }
    }

    res.json({ message: 'Payment verified successfully', success: true });
  } else {
    // Mark as failed
    await prisma.payment.updateMany({
      where: { transactionId: razorpay_order_id },
      data: { status: 'FAILED' }
    });

    res.status(400).json({ error: 'Payment signature verification failed', success: false });
  }
};

// Get user subscription
exports.getSubscription = async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(subscription || { status: 'INACTIVE', planId: 'FREE' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

// Get payment history
exports.getPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};
