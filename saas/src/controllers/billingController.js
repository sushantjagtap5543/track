const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/** 📈 GeoSurePath Master Financial Constants (Now Database-Driven) */
let CACHED_PLANS = [];

async function getPlans() {
    if (CACHED_PLANS.length > 0) return CACHED_PLANS;
    const dbPlans = await prisma.plan.findMany();
    CACHED_PLANS = dbPlans.map(p => ({
        id: p.id,
        name: p.name,
        days: p.id === 'monthly' ? 30 : (p.id === 'half_yearly' ? 180 : 365),
        price: p.pricePerDevice,
        discount: p.id === 'yearly' ? 16.7 : 0,
        billingCycle: p.billingCycle
    }));
    return CACHED_PLANS;
}

// Clear cache when admin updates plans
const refreshPlans = () => { CACHED_PLANS = []; };

const generateInvoiceNumber = (sequenceId) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(sequenceId).slice(-4).padStart(4, '0');
    return `GSP/INV/${year}/${month}/${seq}`;
};

const calculateBreakdown = (total) => {
    const baseValue = total / 1.18; 
    const gstValue = total - baseValue;
    const serverCharge = baseValue * 0.15;
    const cloudCharge = baseValue * 0.10;
    const basicAccess = baseValue - serverCharge - cloudCharge;
    return {
        basic: parseFloat(basicAccess.toFixed(2)),
        server: parseFloat(serverCharge.toFixed(2)),
        cloud: parseFloat(cloudCharge.toFixed(2)),
        gst: parseFloat(gstValue.toFixed(2)),
        total: parseFloat(total.toFixed(2))
    };
};

/** 🏎️ HYPER-OPTIMIZED BILLING ENGINE (Relational Mode) */
const calculateBillForAnyUser = async (userId, preloadedUser = null) => {
    const user = preloadedUser || await prisma.user.findUnique({
        where: { id: userId },
        include: { vehicles: true, subscriptions: { orderBy: { createdAt: 'desc' } } }
    });
    if (!user) return null;

    const now = new Date();
    const deviceDetails = (user.vehicles || []).map(v => {
        const regDate = v.registrationDate ? new Date(v.registrationDate) : new Date(user.createdAt);
        const lastSub = user.subscriptions?.[0];
        const lastPaidDate = lastSub ? new Date(lastSub.createdAt) : regDate;
        
        const diffTime = Math.max(0, now - lastPaidDate);
        const totalUnpaidDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const BILLABLE_DAYS_DEBT = Math.min(7, totalUnpaidDays);
        
        const DAILY_RATE_BASE = 6.66;
        const rawAmount = BILLABLE_DAYS_DEBT * DAILY_RATE_BASE;
        const breakdown = calculateBreakdown(rawAmount);

        return {
            imei: v.imei, name: v.name,
            unpaidDays: totalUnpaidDays, billableDebtDays: BILLABLE_DAYS_DEBT,
            amount: breakdown.total, breakdown
        };
    });

    const totalDue = deviceDetails.reduce((sum, d) => sum + d.amount, 0);
    const maxUnpaidDays = Math.max(0, ...deviceDetails.map(d => d.unpaidDays));
    const accessStatus = (maxUnpaidDays <= 0) ? 'PAID' : (maxUnpaidDays <= 7 ? 'GRACE' : 'OVERDUE');

    const plans = await getPlans();

    return {
        userId: user.id, userEmail: user.email,
        totalDue: parseFloat(totalDue.toFixed(2)), currency: 'INR',
        plans: plans.map(p => ({ ...p, costPerDay: parseFloat((p.price / p.days).toFixed(2)), breakdown: calculateBreakdown(p.price) })),
        devices: deviceDetails,
        history: (user.subscriptions || []).map(sub => ({ ...sub, invoiceId: generateInvoiceNumber(sub.id) })),
        sentry: { status: accessStatus, unpaidDays: maxUnpaidDays, graceDaysRemaining: Math.max(0, 7 - maxUnpaidDays), isHardLock: accessStatus === 'OVERDUE' }
    };
};

const getMyBill = async (req, res) => {
    try {
        const bill = await calculateBillForAnyUser(req.user.userId);
        res.json(bill);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

/** 🚀 HYPER-LEDGER BULK AGGREGATE */
const getAllUsersLedger = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    try {
        // Fetch everything in ONE GO
        const users = await prisma.user.findMany({ 
            include: { vehicles: true, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } } 
        });
        
        const ledger = await Promise.all(users.map(async (u) => {
            const bill = await calculateBillForAnyUser(u.id, u);
            return {
                id: u.id, email: u.email, role: u.role,
                fleetSize: u.vehicles.length,
                status: bill?.sentry?.status || 'UNKNOWN',
                totalDue: bill?.totalDue || 0,
                unpaidDays: bill?.sentry?.unpaidDays || 0
            };
        }));
        res.json(ledger);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAdminAnalytics = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    try {
        const subscriptions = await prisma.subscription.findMany({ orderBy: { createdAt: 'desc' } });
        const usersCount = await prisma.user.count();
        const devicesCount = await prisma.vehicle.count();
        const monthlyRevenue = {};
        subscriptions.forEach(sub => {
            const m = sub.createdAt ? sub.createdAt.toISOString().slice(0, 7) : '2026-03';
            monthlyRevenue[m] = (monthlyRevenue[m] || 0) + sub.price;
        });
        const latestMonth = Object.keys(monthlyRevenue).sort().reverse()[0] || 'N/A';
        const config = await prisma.adminSetting.findUnique({ where: { id: 'GLOBAL' } });
        res.json({
            summary: {
                totalRevenue: subscriptions.reduce((s, it) => s + it.price, 0),
                latestMonth, latestRevenue: latestMonth !== 'N/A' ? monthlyRevenue[latestMonth] : 0,
                totalUsers: usersCount, totalDevices: devicesCount,
                approxCollection: devicesCount * 200, churnRate: 2.5
            },
            monthlyBreakdown: monthlyRevenue,
            config: config || { paymentLink: process.env.DEFAULT_PAYMENT_LINK || '#' }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateGatewayConfig = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    const { paymentLink } = req.body;
    try {
        const config = await prisma.adminSetting.upsert({
            where: { id: 'GLOBAL' },
            update: { paymentLink, updatedBy: req.user.userId },
            create: { id: 'GLOBAL', paymentLink, updatedBy: req.user.userId }
        });
        res.json({ message: 'Gateway Configuration Updated', config });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const settleCash = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    const { targetUserId, planId, amount } = req.body;
    try {
        const plans = await getPlans();
        const plan = plans.find(p => p.id === planId);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ((plan?.days || 30) * 24 * 60 * 60 * 1000));
        await prisma.subscription.create({ data: { userId: targetUserId, planId: planId, price: parseFloat(amount), status: 'ACTIVE', expiresAt } });
        await prisma.vehicle.updateMany({ where: { userId: targetUserId }, data: { registrationDate: now } });
        res.json({ message: 'Sovereign Settle Success' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const updatePlan = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    const { planId, name, pricePerDevice, billingCycle } = req.body;
    try {
        await prisma.plan.update({
            where: { id: planId },
            data: { name, pricePerDevice, billingCycle }
        });
        refreshPlans();
        res.json({ message: 'Plan Harmonization Complete. Propagated globally.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const adminUpdateRegistration = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    const { vehicleId, registrationDate } = req.body;
    try {
        const updated = await prisma.vehicle.update({ where: { id: vehicleId }, data: { registrationDate: new Date(registrationDate) } });
        res.json({ message: 'RegSync Success', vehicle: updated });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getMyBill, adminUpdateRegistration, settleCash, getAdminAnalytics, getAllUsersLedger, updateGatewayConfig, updatePlan, getPlans };