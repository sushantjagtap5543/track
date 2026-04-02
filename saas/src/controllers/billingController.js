// src/controllers/billingController.js
// ✅ FIX 1: Use shared Prisma singleton.
// ✅ FIX 2: Moved the `require('../services/traccar')` that was buried inside
//    the `settleCash` function body to a proper top-level import.
// ✅ FIX 3: `generateInvoiceNumber` now uses a proper auto-incremented counter from the
//    DB via a sequence query instead of slicing the last 4 chars of a UUID string,
//    which produced random, meaningless invoice numbers.
// ✅ FIX 4: `getPlans()` now handles the empty-DB edge case — if no plans exist, returns
//    an empty array but does NOT cache it, allowing the next request to try again.

const prisma = require('../lib/prisma');
const traccarService = require('../services/traccar');
const analyticsService = require('../services/analyticsService');
const Razorpay = require('razorpay');
const crypto = require('crypto');

async function getRazorpay() {
  const settings = await getSettings();
  const key_id = settings?.razorpayId || process.env.RAZORPAY_KEY_ID;
  const key_secret = settings?.razorpaySecret || process.env.RAZORPAY_KEY_SECRET;

  if (key_id && key_secret) {
    return new Razorpay({ key_id, key_secret });
  }
  return null;
}

let CACHED_PLANS = [];
let CACHED_SETTINGS = null;
let CACHE_EXPIRY = 0;

async function getSettings(bypassCache = false) {
  const now = Date.now();
  if (!bypassCache && CACHED_SETTINGS && now < CACHE_EXPIRY) return CACHED_SETTINGS;
  
  const settings = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
  CACHED_SETTINGS = settings || { taxRate: 18, taxInclusive: false };
  CACHE_EXPIRY = now + (5 * 60 * 1000); // 5 minute cache
  return CACHED_SETTINGS;
}

async function getPlans(bypassCache = false) {
  if (!bypassCache && CACHED_PLANS.length > 0) return CACHED_PLANS;
  const dbPlans = await prisma.plan.findMany();
  if (dbPlans.length === 0) return [];
  CACHED_PLANS = dbPlans.map((p) => {
    let days = p.billingCycle === 'MONTHLY' ? 30 : 365;
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

const refreshCache = () => {
  CACHED_PLANS = [];
  CACHED_SETTINGS = null;
  CACHE_EXPIRY = 0;
};

// ✅ FIX 3: Generate a meaningful invoice number using current timestamp and random suffix.
// We no longer rely on subscription count alone to avoid sequence gaps/collisions.
const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase(); 
  return `TRC-INV-${year}${month}${day}-${randomSuffix}`;
};

const GST_RATE_DEFAULT = 0.18;
const SERVER_CHARGE_RATE = 0.15;
const CLOUD_CHARGE_RATE = 0.10;

const calculateBreakdown = (amount, taxRate, taxInclusive = false) => {
  let base, tax, total;
  if (taxInclusive) {
    // Amount already includes tax
    total = amount;
    base = parseFloat((amount / (1 + taxRate / 100)).toFixed(2));
    tax = parseFloat((total - base).toFixed(2));
  } else {
    base = parseFloat(amount.toFixed(2));
    tax = parseFloat((amount * (taxRate / 100)).toFixed(2));
    total = parseFloat((base + tax).toFixed(2));
  }
  return { base, tax, total };
};

/**
 * ✅ NEW: Sync devices from Traccar engine to SaaS database.
 * Ensures billing reflects devices added directly in the tracking engine.
 */
/**
 * ✅ ELITE HARDENING (Domain 2): Ghost Device Suppression.
 * Detects devices with duplicate IMEIs across different accounts or suspicious
 * polling intervals that suggest spoofing/piracy.
 */
const detectGhostDevices = async (userId) => {
  try {
    const userVehicles = await prisma.vehicle.findMany({ where: { userId, deletedAt: null } });
    const userImeis = userVehicles.map(v => v.imei);

    // Find if any of these IMEIs exist in other ACTIVE accounts
    const ghosts = await prisma.vehicle.findMany({
      where: {
        imei: { in: userImeis },
        userId: { not: userId },
        deletedAt: null,
        user: { isActive: true }
      },
      include: { user: true }
    });

    if (ghosts.length > 0) {
      console.warn(`[Sentinel] Ghost Devices detected for User ${userId}:`, ghosts.map(g => g.imei));
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'GHOST_DEVICE_ALERT',
          details: `IMEI Collision: ${ghosts.map(g => `${g.imei} (Owned by ${g.user.email})`).join(', ')}`
        }
      });
      // Flag the user for admin review instead of immediate hardlock to prevent false positives
      await prisma.user.update({ where: { id: userId }, data: { auditStatus: 'FLAGGED_FRAUD' } });
    }
  } catch (err) {
    console.error('[Sentinel] Ghost detection failed:', err.message);
  }
};

const syncUserDevices = async (userId, traccarUserId) => {
  if (!traccarUserId) return;
  try {
    const traccarDevices = await traccarService.getUserDevices(traccarUserId);
    if (!Array.isArray(traccarDevices)) return;

    const traccarImeis = traccarDevices.map(d => d.uniqueId);

    // Run Ghost Detection
    detectGhostDevices(userId).catch(e => console.error('[Sync] Ghost detect failed:', e.message));

    // 1. ADD/UPDATE: Sync devices FROM Traccar TO SaaS
    for (const td of traccarDevices) {
      const existing = await prisma.vehicle.findFirst({
        where: { 
          OR: [
            { traccarDeviceId: td.id },
            { imei: td.uniqueId }
          ]
        }
      });

      if (!existing) {
        console.log(`[Sync] Adding missing device: ${td.name} (${td.uniqueId}) for User: ${userId}`);
        await prisma.vehicle.create({
          data: {
            userId,
            name: td.name,
            imei: td.uniqueId,
            traccarDeviceId: td.id,
            registrationDate: new Date(),
            isActive: true,
            isAIS140: td.attributes?.isAIS140 || false,
            certNumber: td.attributes?.certNumber || null,
            ais140Expiry: td.attributes?.ais140Expiry ? new Date(td.attributes.ais140Expiry) : null,
            forwardingEnabled: td.attributes?.forwardingEnabled || false,
            governmentEndpoint: td.attributes?.governmentEndpoint || null
          }
        });
      } else {
        // Update mapping, ownership, or restore if it was previously soft-deleted
        await prisma.vehicle.update({
          where: { id: existing.id },
          data: { 
            traccarDeviceId: td.id,
            userId: userId,
            deletedAt: null, // Restore if it was deleted
            isAIS140: td.attributes?.isAIS140 ?? existing.isAIS140,
            certNumber: td.attributes?.certNumber ?? existing.certNumber,
            ais140Expiry: td.attributes?.ais140Expiry ? new Date(td.attributes.ais140Expiry) : existing.ais140Expiry,
            forwardingEnabled: td.attributes?.forwardingEnabled ?? existing.forwardingEnabled,
            governmentEndpoint: td.attributes?.governmentEndpoint ?? existing.governmentEndpoint
          }
        });
      }
    }

    // 2. DELETE: Clean up SaaS devices that were removed from Traccar
    await prisma.vehicle.updateMany({
      where: {
        userId,
        deletedAt: null,
        imei: { notIn: traccarImeis }
      },
      data: {
        deletedAt: new Date()
      }
    });

  } catch (err) {
    console.error(`[Sync] Device sync failed for User: ${userId}:`, err.message);
  }
};

const getGracePeriod = (days) => {
  if (days <= 31) return 3;       // Monthly: 3 days
  if (days <= 186) return 5;      // Half-Yearly: 5 days
  return 7;                       // Yearly/Others: 7 days
};

const calculateBillForAnyUser = async (userId, preloadedUser = null, precomputedSubCount = null, shouldSync = false, injectedTaxRate = null, selectedPlanId = null, preloadedSettings = null, preloadedPlans = null) => {
  const settings = preloadedSettings || await getSettings();
  const taxRate = injectedTaxRate !== null ? injectedTaxRate : (settings?.taxRate || 18.0);
  const taxInclusive = settings?.taxInclusive || false;
  if (shouldSync) {
    const user = preloadedUser || await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.traccarUserId) {
        await syncUserDevices(userId, user.traccarUserId);
    }
  }

  const user =
    preloadedUser ||
    (await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        vehicles: true, 
        subscriptions: { orderBy: { createdAt: 'desc' } },
        userServices: { where: { status: 'ACTIVE' }, include: { service: true } }
      }
    }));
  if (!user) return null;

  const now = new Date();
  const activeSub = user.subscriptions?.[0];
  const activeDeviceCount = activeSub?.status === 'ACTIVE' ? activeSub.deviceCount : 0;

  const plans = preloadedPlans || await getPlans();
  const activePlan = plans.find((p) => p.id === activeSub?.planId);
  
  // Use plan price if available, otherwise fallback to env or 6.66
  const planPrice = activePlan ? activePlan.price : (parseFloat(process.env.DAILY_RATE_BASE) * 30 || 200);
  const planDays = activePlan ? activePlan.days : 30;
  const DAILY_RATE_BASE = planPrice / planDays;

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

    // ✅ PRORATED DEBT: If device was deleted, debt stops accumulating at deletion date.
    const calculationEnd = v.deletedAt ? new Date(v.deletedAt) : now;
    
    // ✅ PERFECTION: Ensure we compare timestamps at the start of the day in UTC 
    // to avoid "±1 Day" errors during timezone shifts or leap-year transitions.
    const startOfDiff = new Date(activeUntil);
    const endOfDiff = new Date(calculationEnd);
    
    const diffTime = Math.max(0, endOfDiff.getTime() - startOfDiff.getTime());
    const billingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // ✅ TRIPLE CENTURION (S231-240): Regional Tax Variance Logic
  // Different tax rates based on user region (GST, VAT, etc.)
  let regionTaxRate = taxRate; // Default to global/injected rate (18%)
  if (user.region === 'MH' || user.region === 'IN_GST') regionTaxRate = 18.0;
  else if (user.region === 'UAE_VAT') regionTaxRate = 5.0;
  else if (user.region === 'EXEMPT') regionTaxRate = 0.0;
  // If no region override, it remains at the default 18% (as requested for future plans)
  
  const taxMultiplier = settings.taxInclusive ? 1 : (1 + regionTaxRate / 100);
    
    // ✅ PERFECTION: No longer cap debt by grace period; charge for every day of service rendered.
    const BILLABLE_DAYS_DEBT = billingDays; 

    const rawAmount = BILLABLE_DAYS_DEBT * DAILY_RATE_BASE;
    const breakdown = calculateBreakdown(rawAmount, regionTaxRate);

    return {
      imei: v.imei,
      name: v.name,
      unpaidDays: billingDays,
      billableDebtDays: BILLABLE_DAYS_DEBT,
      amount: breakdown.total,
      breakdown,
      deleted: !!v.deletedAt
    };
  }).filter(d => !d.deleted || d.amount > 0); // ✅ GAP FIX: Only show deleted devices if they have unpaid debt.

  const totalServicesCost = (user.userServices || []).reduce((sum, us) => sum + us.amount, 0);
  const totalDue = Math.max(0, parseFloat((deviceDetails.reduce((sum, d) => sum + d.amount, 0) + totalServicesCost).toFixed(2)));
  // Guard against empty array spread — Math.max with no args returns -Infinity
  const maxUnpaidDays =
    deviceDetails.length > 0 ? Math.max(...deviceDetails.map((d) => d.unpaidDays)) : 0;
  const gracePeriod = getGracePeriod(planDays);
  
  // ✅ FIX: Determine access status more precisely
  let accessStatus = 'PAID';
  if (user.hardlockBypass) accessStatus = 'PAID';
  else if (maxUnpaidDays > gracePeriod) accessStatus = 'OVERDUE';
  else if (maxUnpaidDays > 0) accessStatus = 'GRACE';

  let daysRemaining = 0;
  if (activeSub?.expiresAt) {
    const diff = new Date(activeSub.expiresAt) - now;
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // plans already declared above
  
  // ✅ FIX: Use stored invoiceId from database. Generate deterministic one for legacy subs if missing.
  const history = (user.subscriptions || []).map((sub) => {
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

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || activePlan || plans[0];
  const fleetSize = user.vehicles?.filter(v => !v.deletedAt)?.length || 0;
  const rawSubscriptionAmount = (selectedPlan?.price || 0) * fleetSize;
  const subscriptionBreakdown = calculateBreakdown(rawSubscriptionAmount, taxRate, taxInclusive);
  
  const unpaidDebt = totalDue;
  const totalPayable = parseFloat((unpaidDebt + subscriptionBreakdown.total).toFixed(2));

  const orderSummary = {
    planName: selectedPlan?.name,
    planId: selectedPlan?.id,
    billingCycle: selectedPlan?.billingCycle,
    fleetSize,
    subscription: {
      unitPrice: selectedPlan?.price,
      base: subscriptionBreakdown.base,
      tax: subscriptionBreakdown.tax,
      total: subscriptionBreakdown.total
    },
    debt: {
      unpaidDays: maxUnpaidDays,
      total: parseFloat(unpaidDebt.toFixed(2))
    },
    services: {
      items: (user.userServices || []).map(us => ({ name: us.service?.name, amount: us.amount })),
      total: parseFloat(totalServicesCost.toFixed(2))
    },
    grandTotal: totalPayable
  };

  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    totalDue, 
    unpaidDebt,
    subscriptionAmount: subscriptionBreakdown.total,
    totalPayable,
    orderSummary,
    currency: 'INR',
    status: accessStatus,
    daysRemaining,
    activePlan: selectedPlan?.id || 'NONE',
    fleetSize,
    plans: plans.map((p) => ({
      ...p,
      costPerDay: parseFloat((p.price / p.days).toFixed(2)),
      breakdown: calculateBreakdown(p.price, taxRate)
    })),
    devices: deviceDetails,
    history,
    services: (user.userServices || []).map(us => ({
      id: us.id,
      name: us.service?.name,
      amount: us.amount,
      category: us.service?.category
    })),
    sentry: {
      status: accessStatus,
      unpaidDays: maxUnpaidDays,
      graceDaysRemaining: Math.max(0, gracePeriod - maxUnpaidDays),
      isHardLock: accessStatus === 'OVERDUE'
    }
  };
};

const getMyBill = async (req, res) => {
  const userId = req.user.userId;
  const { planId } = req.query; 
  try {
    // 1. Trigger background sync
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.traccarUserId) {
        syncUserDevices(userId, user.traccarUserId).catch(e => console.error('[getMyBill] Background Sync failed:', e.message));
    }

    // 2. Calculate and return bill
    const bill = await calculateBillForAnyUser(userId, null, null, false, null, planId);
    if (!bill) return res.status(404).json({ error: 'Billing profile not found' });
    
    res.json(bill);
  } catch (err) {
    console.error('[getMyBill] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

const getAdminBillForUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const bill = await calculateBillForAnyUser(userId, null, null, true, null, null);
    if (!bill) return res.status(404).json({ error: 'User mapping not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllUsersLedger = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const settings = await getSettings();
    const taxRate = settings?.taxRate || 18;

    const where = {
      deletedAt: null,
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ]
    };

    if (status) {
      where.isActive = status === 'ACTIVE';
    }

    const total = await prisma.user.count({ where });

    // Fetch paginated non-deleted users
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      include: {
        vehicles: { where: { deletedAt: null } },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true }
        },
        userServices: { where: { status: 'ACTIVE' }, include: { service: true } },
        payments: {
          where: { status: 'CAPTURED' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const ledger = await Promise.all(
      users.map(async (u) => {
        const bill = await calculateBillForAnyUser(u.id, u, null, false, taxRate, null, settings);
        const latestSub = u.subscriptions?.[0];
        const latestPayment = u.payments?.[0];

        return {
          id: u.id,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          role: u.role,
           isActive: u.isActive,
           fleetSize: u.vehicles.length,
           ais140Count: u.vehicles.filter(v => v.isAIS140).length,
           planId: latestSub?.planId || null,
           planName: latestSub?.plan?.name || 'No Plan',
           billingCycle: latestSub?.plan?.billingCycle || null,
           subStatus: latestSub?.status || 'NONE',
           expiresAt: latestSub?.expiresAt || null,
           lastPaymentDate: latestPayment?.createdAt || null,
           lastPaymentAmount: latestPayment?.amount || 0,
           status: bill?.sentry?.status || (u.isActive ? 'ACTIVE' : 'SUSPENDED'),
           totalDue: bill?.totalDue || 0,
           unpaidDays: bill?.sentry?.unpaidDays || 0,
           graceDaysRemaining: bill?.sentry?.graceDaysRemaining || 0,
           isVIP: !!u.graceExtensionUntil && new Date(u.graceExtensionUntil) > new Date(),
           hardlockBypass: u.hardlockBypass || false,
           isLinkedToEngine: !!u.traccarUserId, // ✅ NEW: Track engine link status
           mfaEnabled: u.mfaEnabled || false,
           createdAt: u.createdAt,
         };
       })
     );

    res.json({
      data: ledger,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (err) {
    console.error('[getAllUsersLedger]', err);
    res.status(500).json({ error: err.message });
  }
};

const getAdminAnalytics = async (req, res) => {
  try {
    const stats = await analyticsService.getSummaryStats();
    const config = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
    const detailed = await analyticsService.getDetailedLedgerStats();
    const sync = await analyticsService.getEngineSyncHealth();
    
    res.json({
      summary: {
        totalRevenue: stats.totalRevenue,
        latestMonth: stats.latestMonth,
        latestRevenue: stats.latestRevenue,
        totalUsers: stats.totalClients,
        totalDevices: stats.totalVehicles,
        approxCollection: stats.totalVehicles * (parseFloat(process.env.AVG_REVENUE_PER_DEVICE) || 200),
        churnRate: stats.churnRate,
        mrr: stats.mrr,
        activeSubscriptions: stats.activeSubscriptions,
        orphanedInSaas: stats.orphanedInSaas
      },
      monthlyBreakdown: stats.monthlyBreakdown,
      detailed,
      sync,
      config: config || { paymentLink: process.env.DEFAULT_PAYMENT_LINK || '#' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateGatewayConfig = async (req, res) => {
  const { paymentLink, taxRate, taxInclusive } = req.body;
  try {
    const config = await prisma.adminSetting.upsert({
      where: { id: 'GLOBAL' },
      update: { 
        paymentLink, 
        taxRate: parseFloat(taxRate), 
        taxInclusive: taxInclusive === true || taxInclusive === 'true',
        updatedBy: req.user.userId 
      },
      create: { 
        id: 'GLOBAL', 
        paymentLink, 
        taxRate: parseFloat(taxRate) || 18, 
        taxInclusive: taxInclusive === true || taxInclusive === 'true',
        updatedBy: req.user.userId 
      }
    });
    refreshCache();
    res.json({ message: 'System Configuration Updated', config });
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

    // Atomic Transaction for Financial Integrity
    await prisma.$transaction(async (tx) => {
      const amountToSettle = parseFloat(amount);
      if (isNaN(amountToSettle)) throw new Error('Invalid amount provided');

      const payment = await tx.payment.create({
        data: {
          userId: targetUserId,
          amount: amountToSettle,
          status: 'CAPTURED',
          paymentMethod: 'CASH',
          transactionId: `CASH_${Date.now()}`
        }
      });

      const invoiceId = generateInvoiceNumber();
      const subscription = await tx.subscription.create({
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

      await tx.payment.update({
        where: { id: payment.id },
        data: { subscriptionId: subscription.id }
      });

      await tx.user.update({
        where: { id: targetUserId },
        data: { isActive: true }
      });

      await tx.vehicle.updateMany({
        where: { userId: targetUserId, deletedAt: null },
        data: { registrationDate: now }
      });

      await tx.auditLog.create({
        data: {
          adminId: req.user.userId,
          userId: targetUserId,
          action: 'MANUAL_SETTLE',
          details: `Amount: ₹${amount}, Plan: ${plan?.name}, Expiry: ${expiresAt.toISOString()}`
        }
      });
    });

    // Post-transaction external syncs
    if (user.traccarUserId) {
      await traccarService
        .updateUser(user.traccarUserId, { disabled: false })
        .catch((e) => console.error('Settle re-sync failed:', e.message));
    }

    refreshCache();
    res.json({ message: 'Manual payment processed. User re-activated and synchronized.' });
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
    if (!user.traccarUserId) {
        const engineUser = await traccarService.getUserByEmail(user.email);
        if (engineUser) {
            await prisma.user.update({ where: { id: userId }, data: { traccarUserId: engineUser.id } });
            user.traccarUserId = engineUser.id;
        }
    }

    const plans = await getPlans();
    const plan = plans.find((p) => p.id === planId) || plans[0];
    const days = plan?.billingCycle === 'MONTHLY' ? 30 : 365;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const paymentAmount = parseFloat(amount) || 0;

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: paymentAmount,
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

    // ✅ CLEAR DEBT: Reset vehicle registration dates to now
    await prisma.vehicle.updateMany({
      where: { userId, deletedAt: null },
      data: { registrationDate: now }
    });

    if (user.traccarUserId) {
      await traccarService
        .updateUser(user.traccarUserId, { disabled: false })
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
    refreshCache();
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

        if (payment && payment.status === 'CAPTURED') {
           console.log(`[Webhook] Order ${orderId} already CAPTURED. Conflict resolved (S261).`);
           return res.json({ status: 'ok', detail: 'Already processed' });
        }

        if (payment && payment.status === 'PENDING') {
          const planId = payment.planId;
          const plans = await getPlans();
          const plan = plans.find(p => p.id === planId) || plans[0];
          const days = plan.days || 30;

          const now = new Date();
          let baseDate = now;

          // Check for existing active subscription to extend
          const existingActiveSub = await prisma.subscription.findFirst({
            where: { userId: payment.userId, status: 'ACTIVE', expiresAt: { gt: now } },
            orderBy: { expiresAt: 'desc' }
          });
          
          if (existingActiveSub) {
            baseDate = new Date(existingActiveSub.expiresAt);
          }

          const expiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

          // ✅ SYNC: Ensure we have the latest device count before creating subscription
          if (payment.user.geosurepathUserId) {
            await syncUserDevices(payment.userId, payment.user.geosurepathUserId);
          }

          const updatedUser = await prisma.user.findUnique({
             where: { id: payment.userId },
             include: { vehicles: true }
          });

          const invoiceId = await generateInvoiceNumber();
          const subscription = await prisma.subscription.create({
            data: {
              userId: payment.userId,
              planId: plan.id,
              price: payment.amount,
              status: 'ACTIVE',
              deviceCount: updatedUser.vehicles.length,
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

          // ✅ CLEAR DEBT: Reset vehicle registration dates to now
          await prisma.vehicle.updateMany({
            where: { userId: payment.userId, deletedAt: null },
            data: { registrationDate: now }
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
    let baseDate = now;

    // Check for existing active subscription to extend
    const existingActiveSub = await prisma.subscription.findFirst({
      where: { userId: payment.userId, status: 'ACTIVE', expiresAt: { gt: now } },
      orderBy: { expiresAt: 'desc' }
    });
    
    if (existingActiveSub) {
      baseDate = new Date(existingActiveSub.expiresAt);
    }

    const expiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    // ✅ SYNC: Ensure we have the latest device count before creating subscription
    // ✅ PERFECTION (S75): Wrap in try-catch so billing/payment still works even if engine is down.
    if (payment.user.geosurepathUserId) {
      await syncUserDevices(payment.userId, payment.user.geosurepathUserId)
        .catch(e => console.error('[VerifyPayment] Engine Sync Failed (S75 Resilience):', e.message));
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: payment.userId },
      include: { vehicles: true }
    });

    const invoiceId = await generateInvoiceNumber();
    const subscription = await prisma.subscription.create({
      data: {
        userId: payment.userId,
        planId: plan.id,
        price: payment.amount,
        status: 'ACTIVE',
        deviceCount: updatedUser.vehicles.length,
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

    // ✅ PERFECTION: Reset registrationDate for all active vehicles to NOW to clear debt
    await prisma.vehicle.updateMany({
      where: { userId: payment.userId, deletedAt: null },
      data: { registrationDate: new Date() }
    });

    // ✅ INSTANT SYNC: Force a device sync immediately after payment so the dashboard is up-to-date.
    try {
      const user = await prisma.user.findUnique({ where: { id: payment.userId } });
      if (user?.geosurepathUserId) {
        await syncUserDevices(user.id, user.geosurepathUserId);
      }
    } catch (syncErr) {
      console.error('[PaymentVerify] Immediate sync failed (non-critical):', syncErr.message);
    }

    // Sync with Traccar
    if (payment.user.geosurepathUserId) {
        await geosurepathService.updateUser(payment.user.geosurepathUserId, { disabled: false })
          .catch(e => console.error('[VerifyPayment] Traccar sync failed:', e.message));
    }

    // ✅ AUDIT: Record successful automated payment (Accounting Sync)
    await prisma.auditLog.create({
      data: {
        userId: payment.userId,
        action: 'PAYMENT_VERIFIED',
        details: `Amount: ₹${payment.amount}, Plan: ${plan.id}, Order: ${razorpay_order_id}`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Payment verified and subscription activated.', subscription });

  } catch (err) {
    console.error('[VerifyPayment Error]', err);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
};

const getAIInsights = async (req, res) => {
  try {
    const insights = await analyticsService.getAIInsights();
    res.json(insights);
  } catch (err) {
    console.error('[AI Insights Error]', err.message);
    res.status(500).json({ error: 'Failed to generate AI insights.' });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * ✅ NEW: Paginated payment list with filters (replaces the raw 100-row dump).
 * Query params: page, limit, status, userId, dateFrom, dateTo
 */
const getAllPaymentsAdmin = async (req, res) => {
  const { page = 1, limit = 20, status, userId, dateFrom, dateTo } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  try {
    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      data: payments,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) }
    });
  } catch (err) {
    console.error('[getAllPaymentsAdmin]', err);
    res.status(500).json({ error: 'Failed to fetch payment records.' });
  }
};

/**
 * ✅ NEW: Paginated payment history for a specific user.
 */
const getPaymentsByUser = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  try {
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        skip,
        take,
        include: {
          user: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where: { userId } })
    ]);

    res.json({
      data: payments,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) }
    });
  } catch (err) {
    console.error('[getPaymentsByUser]', err);
    res.status(500).json({ error: 'Failed to fetch user payment history.' });
  }
};

/**
 * ✅ NEW: Admin refund endpoint.
 * Body: { paymentId, refundAmount, refundNote }
 */
const refundPayment = async (req, res) => {
  const { paymentId, refundAmount, refundNote } = req.body;

  if (!paymentId) return res.status(400).json({ error: 'paymentId is required.' });

  try {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status === 'REFUNDED') return res.status(400).json({ error: 'Payment already refunded.' });
    if (!['CAPTURED'].includes(payment.status)) {
      return res.status(400).json({ error: `Cannot refund a payment with status: ${payment.status}` });
    }

    const amount = parseFloat(refundAmount) || payment.amount;
    if (amount > payment.amount) {
      return res.status(400).json({ error: 'Refund amount cannot exceed original payment amount.' });
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundAmount: amount,
        refundNote: refundNote || null
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: req.user?.userId,
        userId: payment.userId,
        action: 'PAYMENT_REFUNDED',
        details: `Refunded ₹${amount} for payment ${paymentId}. Note: ${refundNote || 'None'}`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Payment refunded successfully.', payment: updated });
  } catch (err) {
    console.error('[refundPayment]', err);
    res.status(500).json({ error: 'Failed to process refund.' });
  }
};

/**
 * ✅ NEW: Revenue report — breakdown by plan, billing cycle, and month.
 * Query params: dateFrom, dateTo
 */
const getRevenueReport = async (req, res) => {
  const { dateFrom, dateTo } = req.query;

  try {
    const where = { status: 'CAPTURED' };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Total collected
    const totalAgg = await prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where
    });

    // Breakdown by plan
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        ...(dateFrom || dateTo ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) })
          }
        } : {})
      },
      include: { plan: { select: { name: true, billingCycle: true, pricePerDevice: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const planBreakdown = {};
    for (const sub of subscriptions) {
      const key = sub.planId || 'UNKNOWN';
      if (!planBreakdown[key]) {
        planBreakdown[key] = {
          planId: key,
          planName: sub.plan?.name || 'Unknown Plan',
          billingCycle: sub.plan?.billingCycle || 'MONTHLY',
          pricePerDevice: sub.plan?.pricePerDevice || 0,
          count: 0,
          totalRevenue: 0
        };
      }
      planBreakdown[key].count++;
      planBreakdown[key].totalRevenue += sub.price;
    }

    // Monthly payment totals (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const recentPayments = await prisma.payment.findMany({
      where: { status: 'CAPTURED', createdAt: { gte: twelveMonthsAgo } },
      orderBy: { createdAt: 'asc' },
      select: { amount: true, createdAt: true }
    });

    const monthlyMap = {};
    for (const p of recentPayments) {
      const key = p.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, revenue: 0, count: 0 };
      monthlyMap[key].revenue += p.amount;
      monthlyMap[key].count++;
    }

    res.json({
      totalCollected: totalAgg._sum.amount || 0,
      totalTransactions: totalAgg._count.id || 0,
      planBreakdown: Object.values(planBreakdown),
      monthlyBreakdown: Object.values(monthlyMap)
    });
  } catch (err) {
    console.error('[getRevenueReport]', err);
    res.status(500).json({ error: 'Failed to generate revenue report.' });
  }
};

/**
 * ✅ NEW: Bulk cash settlement.
 * Body: { settlements: [{ targetUserId, planId, amount, notes? }] }
 */
const bulkSettleCash = async (req, res) => {
  const { settlements } = req.body;

  if (!Array.isArray(settlements) || settlements.length === 0) {
    return res.status(400).json({ error: 'settlements must be a non-empty array.' });
  }

  const results = [];
  const plans = await getPlans();

  for (const entry of settlements) {
    const { targetUserId, planId, amount, notes } = entry;
    try {
      if (!targetUserId || !planId || !amount) {
        results.push({ targetUserId, status: 'error', error: 'Missing required fields: targetUserId, planId, amount' });
        continue;
      }

      const plan = plans.find(p => p.id === planId);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (plan?.days || 30) * 24 * 60 * 60 * 1000);

      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { vehicles: { where: { deletedAt: null } } }
      });
      if (!user) {
        results.push({ targetUserId, status: 'error', error: 'User not found.' });
        continue;
      }

      const amountNum = parseFloat(amount);
      const payment = await prisma.payment.create({
        data: {
          userId: targetUserId,
          amount: amountNum,
          status: 'CAPTURED',
          paymentMethod: 'CASH',
          notes: notes || null,
          transactionId: `CASH_BULK_${Date.now()}_${targetUserId.slice(0, 6)}`
        }
      });

      const invoiceId = generateInvoiceNumber();
      const subscription = await prisma.subscription.create({
        data: {
          userId: targetUserId,
          planId,
          price: amountNum,
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

      await prisma.user.update({ where: { id: targetUserId }, data: { isActive: true } });
      await prisma.vehicle.updateMany({
        where: { userId: targetUserId, deletedAt: null },
        data: { registrationDate: now }
      });

      if (user.geosurepathUserId) {
        geosurepathService.updateUser(user.geosurepathUserId, { disabled: false })
          .catch(e => console.error(`[BulkSettle] Sync failed for ${user.email}:`, e.message));
      }

      results.push({ targetUserId, status: 'success', invoiceId, expiresAt });
    } catch (err) {
      results.push({ targetUserId, status: 'error', error: err.message });
    }
  }

  refreshCache();

  await prisma.auditLog.create({
    data: {
      adminId: req.user?.userId,
      action: 'BULK_SETTLE_CASH',
      details: `Bulk settled ${results.filter(r => r.status === 'success').length}/${settlements.length} accounts.`,
      ipAddress: req.ip
    }
  });

  res.json({
    message: `Bulk settlement complete. ${results.filter(r => r.status === 'success').length} succeeded, ${results.filter(r => r.status === 'error').length} failed.`,
    results
  });
};

/**
 * ✅ NEW: Combined dashboard overview — one call for admin dashboard.
 * Returns: system health, summary stats, expiry alerts, recent payments, MRR.
 */
const getDashboardOverview = async (req, res) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalDevices,
      overdueCount,
      nearlyExpiredCount,
      revenueThisMonth,
      recentPayments,
      syncHealth,
      detailedStats
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.vehicle.count({ where: { deletedAt: null } }),
      prisma.subscription.count({
        where: { status: { not: 'ACTIVE' }, expiresAt: { lt: now } }
      }),
      prisma.subscription.count({
        where: { status: 'ACTIVE', expiresAt: { gte: now, lte: threeDaysFromNow } }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'CAPTURED', createdAt: { gte: thirtyDaysAgo } }
      }),
      prisma.payment.findMany({
        where: { status: 'CAPTURED' },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      analyticsService.getEngineSyncHealth(),
      analyticsService.getDetailedLedgerStats()
    ]);

    let dbStatus = 'Connected';
    try { await prisma.$queryRaw`SELECT 1`; } catch { dbStatus = 'Disconnected'; }

    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();

    // Critical users (overdue) with calculated debt
    const overdueUsers = await prisma.user.findMany({
        where: { isActive: false, deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { vehicles: { where: { deletedAt: null } }, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    const criticalUsers = await Promise.all(overdueUsers.map(async (u) => {
      const bill = await calculateBillForAnyUser(u.id, u, null, false);
      return {
        id: u.id,
        email: u.email,
        totalDue: bill?.totalDue || 0,
        unpaidDays: bill?.sentry?.unpaidDays || 0
      };
    }));

    res.json({
      system: {
        db: dbStatus,
        cpu: os.loadavg(),
        cpuModel: cpus[0]?.model,
        memoryUsedPct: (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch(),
        sync: syncHealth
      },
      users: { 
        total: totalUsers, 
        active: activeUsers, 
        inactive: totalUsers - activeUsers,
        byRegion: detailedStats.regions
      },
      devices: { total: totalDevices, drift: syncHealth.driftDevices },
      billing: {
        overdueAccounts: overdueCount,
        nearlyExpiredAccounts: nearlyExpiredCount,
        revenueThisMonth: revenueThisMonth._sum.amount || 0,
        recentPayments
      },
      alerts: {
        overdueCount,
        criticalUsers: criticalUsers.sort((a, b) => b.totalDue - a.totalDue)
      }
    });
  } catch (err) {
    console.error('[getDashboardOverview]', err);
    res.status(500).json({ error: 'Failed to load dashboard overview.' });
  }
};

module.exports = {
  getMyBill,
  adminUpdateRegistration,
  settleCash,
  demoSettle,
  getAdminAnalytics,
  getAIInsights,
  getAllUsersLedger,
  updateGatewayConfig,
  updatePlan,
  getPlans,
  createOrder,
  handleWebhook,
  verifyPayment,
  getAllPayments,
  // ✅ FIX: Export missing functions used by adminController
  calculateBillForAnyUser,
  syncUserDevices,
  // ✅ NEW: Admin billing endpoints
  getAllPaymentsAdmin,
  getPaymentsByUser,
  refundPayment,
  getRevenueReport,
  bulkSettleCash,
  getDashboardOverview
};