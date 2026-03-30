// src/controllers/billingController.js
// ✅ FIX 1: Use shared Prisma singleton.
// ✅ FIX 2: Moved the `require('../services/geosurepath')` that was buried inside
//    the `settleCash` function body to a proper top-level import.
// ✅ FIX 3: `generateInvoiceNumber` now uses a proper auto-incremented counter from the
//    DB via a sequence query instead of slicing the last 4 chars of a UUID string,
//    which produced random, meaningless invoice numbers.
// ✅ FIX 4: `getPlans()` now handles the empty-DB edge case — if no plans exist, returns
//    an empty array but does NOT cache it, allowing the next request to try again.

const prisma = require('../lib/prisma');
const geosurepathService = require('../services/geosurepath');
const analyticsService = require('../services/analyticsService');
const Razorpay = require('razorpay');
const crypto = require('crypto');

async function getRazorpay() {
  const settings = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
  
  const key_id = settings?.razorpayId || process.env.RAZORPAY_KEY_ID;
  const key_secret = settings?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET;

  if (key_id && key_secret) {
    return new Razorpay({ key_id, key_secret });
  }
  return null;
}

let CACHED_PLANS = [];

async function getPlans() {
  if (CACHED_PLANS.length > 0) return CACHED_PLANS;
  const dbPlans = await prisma.plan.findMany();
  // ✅ FIX 4: Only cache if plans actually exist in the database.
  if (dbPlans.length === 0) return [];
  CACHED_PLANS = dbPlans.map((p) => {
    let days = p.billingCycle === 'MONTHLY' ? 30 : 365;
    // Handle intermediate plans based on ID or Name
    if (p.id.includes('half') || p.name.includes('6 Month') || p.name.includes('Half') || p.name.includes('Safe Shield')) {
      days = 180;
    }
    return {
      id: p.id,
      name: p.name,
      days,
      price: p.pricePerDevice,
      discount: p.billingCycle === 'YEARLY' ? 16.7 : 0,
      billingCycle: p.billingCycle
    };
  });
  return CACHED_PLANS;
}

const refreshPlans = () => {
  CACHED_PLANS = [];
};

// ✅ FIX 3: Generate a meaningful invoice number using current timestamp and random suffix.
// We no longer rely on subscription count alone to avoid sequence gaps/collisions.
const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase(); 
  return `GSP-INV-${year}${month}${day}-${randomSuffix}`;
};

const GST_RATE = 0.18;
const SERVER_CHARGE_RATE = 0.15;
const CLOUD_CHARGE_RATE = 0.10;

const calculateBreakdown = (total) => {
  if (!total || total <= 0) {
    return { basic: 0, server: 0, cloud: 0, gst: 0, total: 0 };
  }
  const baseValue = total / (1 + GST_RATE);
  const gstValue = total - baseValue;
  const serverCharge = baseValue * SERVER_CHARGE_RATE;
  const cloudCharge = baseValue * CLOUD_CHARGE_RATE;
  const basicAccess = baseValue - serverCharge - cloudCharge;
  return {
    basic: parseFloat(basicAccess.toFixed(2)),
    server: parseFloat(serverCharge.toFixed(2)),
    cloud: parseFloat(cloudCharge.toFixed(2)),
    gst: parseFloat(gstValue.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

const calculateBillForAnyUser = async (userId, preloadedUser = null, precomputedSubCount = null) => {
  const user =
    preloadedUser ||
    (await prisma.user.findUnique({
      where: { id: userId },
      include: { vehicles: true, subscriptions: { orderBy: { createdAt: 'desc' } } }
    }));
  if (!user) return null;

  const now = new Date();
  const activeSub = user.subscriptions?.[0];
  const activeDeviceCount = activeSub?.status === 'ACTIVE' ? activeSub.deviceCount : 0;

  const deviceDetails = (user.vehicles || []).map((v, index) => {
    const regDate = v.registrationDate ? new Date(v.registrationDate) : new Date(user.createdAt);
    
    // Per-device logic: If this device is "beyond" the paid deviceCount, its activeUntil is its own regDate.
    // However, if the user has a manually extended grace period, we respect that too.
    const effectiveSubExpiresAt = (user.graceExtensionUntil && new Date(user.graceExtensionUntil) > now)
      ? new Date(user.graceExtensionUntil)
      : (activeSub?.expiresAt ? new Date(activeSub.expiresAt) : null);

    const activeUntil = (index < activeDeviceCount && effectiveSubExpiresAt) 
      ? effectiveSubExpiresAt 
      : regDate;

    const diffTime = Math.max(0, now - activeUntil);
    const totalUnpaidDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const BILLABLE_DAYS_DEBT = Math.min(7, totalUnpaidDays);

    const DAILY_RATE_BASE = parseFloat(process.env.DAILY_RATE_BASE) || 6.66;
    const rawAmount = BILLABLE_DAYS_DEBT * DAILY_RATE_BASE;
    const breakdown = calculateBreakdown(rawAmount);

    return {
      imei: v.imei,
      name: v.name,
      unpaidDays: totalUnpaidDays,
      billableDebtDays: BILLABLE_DAYS_DEBT,
      amount: breakdown.total,
      breakdown
    };
  });

  const totalDue = deviceDetails.reduce((sum, d) => sum + d.amount, 0);
  // Guard against empty array spread — Math.max with no args returns -Infinity
  const maxUnpaidDays =
    deviceDetails.length > 0 ? Math.max(...deviceDetails.map((d) => d.unpaidDays)) : 0;
  const accessStatus =
    maxUnpaidDays <= 0 ? 'PAID' : maxUnpaidDays <= 7 ? 'GRACE' : 'OVERDUE';

  const plans = await getPlans();
  
  // ✅ FIX: Use stored invoiceId from database. Generate deterministic one for legacy subs if missing.
  const history = user.subscriptions.map((sub) => {
    let invId = sub.invoiceId;
    if (!invId) {
      // Fallback for legacy subscriptions: Use a deterministic ID based on sub ID
      const datePart = sub.createdAt.toISOString().slice(0, 10).replace(/-/g, '');
      invId = `GSP-LEGACY-${datePart}-${sub.id.slice(0, 8).toUpperCase()}`;
    }
    return {
      ...sub,
      invoiceId: invId
    };
  });

  return {
    userId: user.id,
    userEmail: user.email,
    totalDue: parseFloat(totalDue.toFixed(2)),
    currency: 'INR',
    plans: plans.map((p) => ({
      ...p,
      costPerDay: parseFloat((p.price / p.days).toFixed(2)),
      breakdown: calculateBreakdown(p.price)
    })),
    devices: deviceDetails,
    history,
    sentry: {
      status: accessStatus,
      unpaidDays: maxUnpaidDays,
      graceDaysRemaining: Math.max(0, 7 - maxUnpaidDays),
      isHardLock: accessStatus === 'OVERDUE'
    }
  };
};

const getMyBill = async (req, res) => {
  try {
    const bill = await calculateBillForAnyUser(req.user.userId);
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllUsersLedger = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        vehicles: true,
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    const totalSubCount = await prisma.subscription.count();
    const ledger = await Promise.all(
      users.map(async (u) => {
        const bill = await calculateBillForAnyUser(u.id, u, totalSubCount);
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          fleetSize: u.vehicles.length,
          status: bill?.sentry?.status || 'UNKNOWN',
          totalDue: bill?.totalDue || 0,
          unpaidDays: bill?.sentry?.unpaidDays || 0,
          isVIP: !!u.graceExtensionUntil && new Date(u.graceExtensionUntil) > new Date()
        };
      })
    );
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAdminAnalytics = async (req, res) => {
  try {
    const stats = await analyticsService.getSummaryStats();
    const config = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
    
    res.json({
      summary: {
        totalRevenue: stats.totalRevenue,
        latestMonth: stats.latestMonth,
        latestRevenue: stats.latestRevenue,
        totalUsers: stats.totalClients,
        totalDevices: stats.totalVehicles,
        approxCollection: stats.totalVehicles * (parseFloat(process.env.AVG_REVENUE_PER_DEVICE) || 200),
        churnRate: stats.churnRate
      },
      monthlyBreakdown: stats.monthlyBreakdown,
      config: config || { paymentLink: process.env.DEFAULT_PAYMENT_LINK || '#' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateGatewayConfig = async (req, res) => {
  const { paymentLink } = req.body;
  try {
    const config = await prisma.adminSetting.upsert({
      where: { id: 'GLOBAL' },
      update: { paymentLink, updatedBy: req.user.userId },
      create: { id: 'GLOBAL', paymentLink, updatedBy: req.user.userId }
    });
    res.json({ message: 'Gateway Configuration Updated', config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const settleCash = async (req, res) => {
  const { targetUserId, planId, amount } = req.body;
  try {
    const plans = await getPlans();
    const plan = plans.find((p) => p.id === planId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (plan?.days || 30) * 24 * 60 * 60 * 1000);

    const user = await prisma.user.findUnique({ 
      where: { id: targetUserId },
      include: { vehicles: true }
    });
    if (!user) throw new Error('Target user not found in SaaS Ledger.');

    // ✅ RECOVERY: If engine ID is missing, try a lookup by email
    if (!user.geosurepathUserId) {
        const engineUser = await geosurepathService.getUserByEmail(user.email);
        if (engineUser) {
            await prisma.user.update({ where: { id: targetUserId }, data: { geosurepathUserId: engineUser.id } });
            user.geosurepathUserId = engineUser.id;
        }
    }

    const amountToSettle = parseFloat(amount);
    if (isNaN(amountToSettle)) throw new Error('Invalid amount provided');

    // ✅ REFINEMENT: Create a Payment record for the audit trail
    const payment = await prisma.payment.create({
      data: {
        userId: targetUserId,
        amount: amountToSettle,
        status: 'CAPTURED',
        paymentMethod: 'CASH',
        transactionId: `CASH_${Date.now()}`
      }
    });

    const invoiceId = await generateInvoiceNumber();
    const subscription = await prisma.subscription.create({
      data: {
        userId: targetUserId,
        planId,
        price: amountToSettle,
        status: 'ACTIVE',
        deviceCount: user.vehicles.length,
        expiresAt,
        invoiceId
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: subscription.id }
    });

    await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: true }
    });
    await prisma.vehicle.updateMany({
      where: { userId: targetUserId },
      data: { registrationDate: now }
    });

    // ✅ FIX 2: geosurepathService is now imported at the top, not inside this function.
    if (user.geosurepathUserId) {
      await geosurepathService
        .updateUser(user.geosurepathUserId, { disabled: false })
        .catch((e) => console.error('Settle re-sync failed:', e.message));
    }

    await prisma.auditLog.create({
      data: {
        adminId: req.user.userId,
        userId: targetUserId,
        action: 'MANUAL_SETTLE',
        details: `Amount: ₹${amount}, Plan: ${plan?.name}, Expiry: ${expiresAt.toISOString()}`
      }
    });

    res.json({ message: 'Manual payment processed. User re-activated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const demoSettle = async (req, res) => {
  const { planId, amount } = req.body;
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { vehicles: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found in SaaS Ledger.' });

    // ✅ RECOVERY: If engine ID is missing, try a lookup by email
    if (!user.geosurepathUserId) {
        const engineUser = await geosurepathService.getUserByEmail(user.email);
        if (engineUser) {
            await prisma.user.update({ where: { id: userId }, data: { geosurepathUserId: engineUser.id } });
            user.geosurepathUserId = engineUser.id;
        }
    }

    const plans = await getPlans();
    const plan = plans.find((p) => p.id === planId) || plans[0];
    const days = plan?.billingCycle === 'MONTHLY' ? 30 : 365;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: parseFloat(amount),
        status: 'CAPTURED',
        paymentMethod: 'DEMO_BYPASS',
        transactionId: `DEMO_${Date.now()}`
      }
    });

    const invoiceId = await generateInvoiceNumber();
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        price: parseFloat(amount),
        status: 'ACTIVE',
        deviceCount: user.vehicles.length,
        expiresAt,
        invoiceId
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: subscription.id }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });

    if (user.geosurepathUserId) {
      await geosurepathService
        .updateUser(user.geosurepathUserId, { disabled: false })
        .catch((e) => console.error('[DemoSettle] sync failed:', e.message));
    }

    res.json({ message: 'Demo Payment Successful! Subscription Activated.', subscription });
  } catch (err) {
    console.error('[DemoSettle] Fatal:', err.message);
    res.status(500).json({ error: `Failed to process demo payment: ${err.message}` });
  }
};

const updatePlan = async (req, res) => {
  const { planId, name, pricePerDevice, billingCycle } = req.body;
  try {
    await prisma.plan.update({
      where: { id: planId },
      data: { name, pricePerDevice, billingCycle }
    });
    refreshPlans();
    res.json({ message: 'Plan Harmonization Complete. Propagated globally.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const adminUpdateRegistration = async (req, res) => {
  const { vehicleId, registrationDate } = req.body;
  try {
    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { registrationDate: new Date(registrationDate) }
    });
    res.json({ message: 'RegSync Success', vehicle: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createOrder = async (req, res) => {
  const { planId, amount } = req.body;
  const userId = req.user.userId;

  try {
    const rzp = await getRazorpay();
    if (!rzp) {
      return res.status(400).json({ error: 'Payment gateway is not configured.' });
    }
    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await rzp.orders.create(options);

    // Track the payment attempt
    await prisma.payment.create({
      data: {
        userId,
        amount: parseFloat(amount),
        status: 'PENDING',
        razorpayOrderId: order.id,
        planId: planId
      }
    });

    const settings = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
    const key = settings?.razorpayId || process.env.RAZORPAY_KEY_ID;

    res.json({
      key,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err) {
    console.error('[Razorpay Order Error]', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

const handleWebhook = async (req, res) => {
  const settings = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
  const secret = settings?.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || 'gsp_webhook_secret';
  
  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest === req.headers['x-razorpay-signature']) {
    const event = req.body.event;
    const { payload } = req.body;

    if (event === 'payment.captured') {
      const { payload } = req.body;
      const orderId = payload.payment.entity.order_id;
      const paymentId = payload.payment.entity.id;

      try {
        // Idempotent update: Only proceed if status is still PENDING or if it's a new payment ID for this order
        let payment = await prisma.payment.findFirst({
          where: { 
            OR: [
              { razorpayOrderId: orderId, status: 'PENDING' },
              { razorpayPaymentId: paymentId } 
            ]
          },
          include: { user: { include: { vehicles: true } } }
        });

        if (payment && payment.status === 'PENDING') {
          const planId = payment.planId;
          const plans = await getPlans();
          const plan = plans.find(p => p.id === planId) || plans[0];
          const days = plan.days || 30;

          const now = new Date();
          const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

          const invoiceId = await generateInvoiceNumber();
          const subscription = await prisma.subscription.create({
            data: {
              userId: payment.userId,
              planId: plan.id,
              price: payment.amount,
              status: 'ACTIVE',
              deviceCount: payment.user.vehicles.length,
              expiresAt,
              invoiceId
            }
          });

          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'CAPTURED',
              razorpayPaymentId: paymentId,
              subscriptionId: subscription.id
            }
          });

          await prisma.user.update({
            where: { id: payment.userId },
            data: { isActive: true }
          });

          // Sync with Traccar
          if (payment.user.geosurepathUserId) {
              await geosurepathService.updateUser(payment.user.geosurepathUserId, { disabled: false })
                .catch(e => console.error('[Webhook] Traccar sync failed:', e.message));
          }

          console.log(`[Webhook] Payment successful and subscription activated for User: ${payment.userId}`);
        }
      } catch (err) {
        console.error('[Webhook Processing Error]', err);
      }
    } else if (event === 'payment.failed') {
      const { payload } = req.body;
      const orderId = payload.payment.entity.order_id;
      const paymentId = payload.payment.entity.id;
      const errorMsg = payload.payment.entity.error_description;

      try {
        await prisma.payment.updateMany({
          where: { razorpayOrderId: orderId, status: 'PENDING' },
          data: { 
            status: 'FAILED',
            razorpayPaymentId: paymentId,
            transactionId: `FAILED_${errorMsg || 'UNKNOWN'}`
          }
        });
        console.log(`[Webhook] Payment failed for Order: ${orderId}. Reason: ${errorMsg}`);
      } catch (err) {
        console.error('[Webhook Failed Event Error]', err);
      }
    }
    res.json({ status: 'ok' });
  } else {
    res.status(403).json({ error: 'Invalid signature' });
  }
};

const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
  const userId = req.user.userId;

  try {
    const settings = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
    const secret = settings?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
        throw new Error('Payment gateway is not configured (missing secret).');
    }

    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Transaction signature mismatch. Security breach blocked.' });
    }

    // Process successful payment
    const payment = await prisma.payment.findFirst({
        where: { razorpayOrderId: razorpay_order_id, status: 'PENDING' },
        include: { user: { include: { vehicles: true } } }
    });

    if (!payment) {
        return res.status(404).json({ error: 'Order not found or already processed.' });
    }

    const planId = payment.planId || 'BASIC_MONTHLY';
    const plans = await getPlans();
    const plan = plans.find(p => p.id === planId) || plans[0];
    const days = plan.days || 30;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const invoiceId = await generateInvoiceNumber();
    const subscription = await prisma.subscription.create({
      data: {
        userId: payment.userId,
        planId: plan.id,
        price: payment.amount,
        status: 'ACTIVE',
        deviceCount: payment.user.vehicles.length,
        expiresAt,
        invoiceId
      }
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'CAPTURED',
        razorpayPaymentId: razorpay_payment_id,
        subscriptionId: subscription.id
      }
    });

    await prisma.user.update({
      where: { id: payment.userId },
      data: { isActive: true }
    });

    // Sync with Traccar
    if (payment.user.geosurepathUserId) {
        await geosurepathService.updateUser(payment.user.geosurepathUserId, { disabled: false })
          .catch(e => console.error('[VerifyPayment] Traccar sync failed:', e.message));
    }

    res.json({ message: 'Payment verified and subscription activated.', subscription });

  } catch (err) {
    console.error('[VerifyPayment Error]', err);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
};

module.exports = {
  getMyBill,
  adminUpdateRegistration,
  settleCash,
  demoSettle,
  getAdminAnalytics,
  getAllUsersLedger,
  updateGatewayConfig,
  updatePlan,
  getPlans,
  createOrder,
  handleWebhook,
  verifyPayment
};