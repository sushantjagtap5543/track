// src/controllers/billingController.js
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxx',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_xxxx'
});

// Create a new order
exports.createOrder = async (req, res) => {
  const { amount, planId } = req.body; // Amount in INR 

  try {
    const options = {
      amount: amount * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    // Track payment intent in DB
    await prisma.payment.create({
      data: {
        userId: req.user.userId,
        amount: amount,
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
    // Assuming a 1-year validity for standard plans
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await prisma.subscription.create({
      data: {
        userId: req.user.userId,
        status: 'ACTIVE',
        planId: planId || 'STANDARD_PLAN',
        price: 0, // Should look up plan pricing in production
        expiresAt: expiresAt
      }
    });

    // Ensure user account is active
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { isActive: true }
    });

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
