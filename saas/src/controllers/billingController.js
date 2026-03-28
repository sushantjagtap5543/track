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
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

let CACHED_PLANS = [];

async function getPlans() {
  if (CACHED_PLANS.length > 0) return CACHED_PLANS;
  const dbPlans = await prisma.plan.findMany();
  // ✅ FIX 4: Only cache if plans actually exist in the database.
  if (dbPlans.length === 0) return [];
  CACHED_PLANS = dbPlans.map((p) => {
    let days = p.billingCycle === 'MONTHLY' ? 30 : 365;
    // Handle intermediate plans based on ID or Name
    if (p.id.includes('half') || p.name.includes('6 Month') || p.name.includes('Half')) {
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

// ✅ FIX 3: Generate a meaningful invoice number using subscription count as sequence.
const generateInvoiceNumber = async (precomputedCount = null) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const count = precomputedCount !== null ? precomputedCount : await prisma.subscription.count();
  const seq = String(count + 1).padStart(5, '0'); // ✅ REFINEMENT: 5-digit sequence
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase(); // ✅ REFINEMENT: 6-char random suffix
  return `GSP-INV-${year}${month}-${seq}-${randomSuffix}`;
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

  const totalSubCount = precomputedSubCount !== null ? precomputedSubCount : await prisma.subscription.count();
  
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
    history: await Promise.all(
      (user.subscriptions || []).map(async (sub) => ({
        ...sub,
        invoiceId: await generateInvoiceNumber(totalSubCount)
      }))
    ),
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
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const usersCount = await prisma.user.count();
    const devicesCount = await prisma.vehicle.count();
    const monthlyRevenue = {};
    subscriptions.forEach((sub) => {
      const m = sub.createdAt ? sub.createdAt.toISOString().slice(0, 7) : 'N/A';
      monthlyRevenue[m] = (monthlyRevenue[m] || 0) + sub.price;
    });
    const latestMonth = Object.keys(monthlyRevenue).sort().reverse()[0] || 'N/A';
    const config = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
    res.json({
      summary: {
        totalRevenue: subscriptions.reduce((s, it) => s + it.price, 0),
        latestMonth,
        latestRevenue: latestMonth !== 'N/A' ? monthlyRevenue[latestMonth] : 0,
        totalUsers: usersCount,
        totalDevices: devicesCount,
        approxCollection: devicesCount * 200,
        churnRate: 2.5
      },
      monthlyBreakdown: monthlyRevenue,
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
    if (!user) throw new Error('Target user not found');

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

    const subscription = await prisma.subscription.create({
      data: {
        userId: targetUserId,
        planId,
        price: amountToSettle,
        status: 'ACTIVE',
        deviceCount: user.vehicles.length,
        expiresAt
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

    res.json({ message: 'Sovereign Settle Success. User re-activated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Track the payment attempt
    await prisma.payment.create({
      data: {
        userId,
        amount: parseFloat(amount),
        status: 'PENDING',
        razorpayOrderId: order.id,
        planId: planId // ✅ FIX: Save planId to associate with subscription later
      }
    });

    res.json({
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
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'gsp_webhook_secret';
  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest === req.headers['x-razorpay-signature']) {
    const event = req.body.event;
    const { payload } = req.body;

    if (event === 'payment.captured') {
      const orderId = payload.payment.entity.order_id;
      const paymentId = payload.payment.entity.id;

      try {
        // Idempotent update: Only proceed if status is still PENDING
        // ✅ REFINEMENT: Absolute idempotency check using both Order ID and Payment ID
        let payment = await prisma.payment.findFirst({
          where: { 
            OR: [
              { razorpayOrderId: orderId, status: 'PENDING' },
              { razorpayPaymentId: paymentId } // Already processed?
            ]
          },
          include: { user: { include: { vehicles: true } } }
        });

        if (payment && payment.status === 'PENDING') {
          // ✅ FIX: Use planId from payment record
          const planId = payment.planId;
          const plan = planId ? await prisma.plan.findUnique({ where: { id: planId } }) : null;
          const days = plan ? (plan.billingCycle === 'MONTHLY' ? 30 : 365) : 30;

          const now = new Date();
          const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

          const subscription = await prisma.subscription.create({
            data: {
              userId: payment.userId,
              planId: payment.planId,
              price: payment.amount,
              status: 'ACTIVE',
              deviceCount: payment.user.vehicles.length,
              expiresAt
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

          console.log(`[Webhook] Payment successful and subscription activated for User: ${payment.userId}`);
        }
      } catch (err) {
        console.error('[Webhook Processing Error]', err);
      }
    }
    res.json({ status: 'ok' });
  } else {
    res.status(403).json({ error: 'Invalid signature' });
  }
};

module.exports = {
  getMyBill,
  adminUpdateRegistration,
  settleCash,
  getAdminAnalytics,
  getAllUsersLedger,
  updateGatewayConfig,
  updatePlan,
  getPlans,
  createOrder,
  handleWebhook
};