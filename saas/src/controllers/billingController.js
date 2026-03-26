const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/** 📈 GeoSurePath Master Financial Constants (Inclusive Rates) */
const PLANS = [
    { id: 'monthly', name: 'Standard Monthly', days: 30, price: 200, discount: 0 },
    { id: 'half_yearly', name: 'Safe Shield (6 Months)', days: 180, price: 1000, discount: 16.7 },
    { id: 'yearly', name: 'Guardian Pro (1 Year)', days: 365, price: 2000, discount: 16.7 }
];

/** 🎯 Professional Invoice & Cloud Report Generator */
const generateInvoiceNumber = (sequenceId) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(sequenceId).slice(-4).padStart(4, '0');
    return `GSP/INV/${year}/${month}/${seq}`;
};

/** ☁️ Proactive Cloud-Ledger Sync (Google Drive) */
const pushPaymentToCloud = async (details) => {
    const webhookUrl = process.env.GOOGLE_WEBHOOK_URL;
    if (!webhookUrl) return console.warn("Cloud-Ledger: Webhook URL missing in .env");

    const report = {
        title: `GeoSurePath Financial Report - ${details.invoiceId}`,
        content: `
=========================================
      GEOSUREPATH - PAYMENT AUDIT
=========================================
INVOICE ID  : ${details.invoiceId}
CLIENT EMAIL: ${details.email}
STATUS      : ${details.status}
-----------------------------------------
SETTLEMENT  : ₹${details.amount} (Incl. GST)
BILLING DATE: ${details.billingDate}
-----------------------------------------
IMEIs SYNCED: ${details.devicesCount} Devices
TIMESTAMP   : ${new Date().toISOString()}
=========================================
        `,
        timestamp: new Date().toISOString(),
        metadata: details
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        console.log(`✅ Cloud-Ledger: Invoice ${details.invoiceId} mirrored to Google Drive.`);
    } catch (err) {
        console.error("❌ Cloud-Ledger: Sync failed:", err.message);
    }
};

/** ⚖️ Financial Breakdown Engine (Inclusive Logic) */
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

/** 🛡️ Internal Bill Calculator for Any User */
const calculateBillForAnyUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { vehicles: true, subscriptions: { orderBy: { createdAt: 'desc' } } }
    });
    if (!user) return null;

    const now = new Date();
    const deviceDetails = user.vehicles.map(v => {
        const regDate = v.registrationDate ? new Date(v.registrationDate) : new Date();
        const lastSub = user.subscriptions[0];
        const lastPaidDate = lastSub ? new Date(lastSub.createdAt) : regDate;
        
        const diffTime = Math.max(0, now - lastPaidDate);
        const totalUnpaidDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const BILLABLE_DAYS_DEBT = Math.min(7, totalUnpaidDays);
        
        const DAILY_RATE_BASE = 6.66;
        const rawAmount = BILLABLE_DAYS_DEBT * DAILY_RATE_BASE;
        const breakdown = calculateBreakdown(rawAmount);

        return {
            imei: v.imei, name: v.name,
            registrationDate: v.registrationDate,
            previousBillingDate: lastPaidDate,
            unpaidDays: totalUnpaidDays, billableDebtDays: BILLABLE_DAYS_DEBT,
            amount: breakdown.total, breakdown
        };
    });

    const totalDue = deviceDetails.reduce((sum, d) => sum + d.amount, 0);
    const maxUnpaidDays = Math.max(0, ...deviceDetails.map(d => d.unpaidDays));
    const accessStatus = maxUnpaidDays === 0 ? 'PAID' : (maxUnpaidDays <= 7 ? 'GRACE' : 'OVERDUE');

    const history = user.subscriptions.map((sub, i) => ({
        ...sub,
        invoiceId: generateInvoiceNumber(sub.id)
    }));

    return {
        userId: user.id, userEmail: user.email,
        totalDue: parseFloat(totalDue.toFixed(2)), currency: 'INR',
        plans: PLANS.map(p => ({ ...p, costPerDay: parseFloat((p.price / p.days).toFixed(2)), breakdown: calculateBreakdown(p.price) })),
        devices: deviceDetails, history,
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
    } catch (err) { res.status(500).json({ error: err.message }); }
};

/** 👑 Global User Ledger Engine */
const getAllUsersLedger = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    try {
        const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
        const ledger = await Promise.all(users.map(async (u) => {
            const bill = await calculateBillForAnyUser(u.id);
            return {
                id: u.id,
                email: u.email,
                role: u.role,
                fleetSize: bill?.devices?.length || 0,
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
        const plan = PLANS.find(p => p.id === planId);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ((plan?.days || 30) * 24 * 60 * 60 * 1000));
        
        const sub = await prisma.subscription.create({
            data: { 
                userId: targetUserId, 
                planId: planId, 
                price: parseFloat(amount), 
                status: 'ACTIVE',
                expiresAt: expiresAt
            }
        });
        
        const user = await prisma.user.findUnique({ where: { id: targetUserId }, include: { vehicles: true } });
        await prisma.vehicle.updateMany({ where: { userId: targetUserId }, data: { registrationDate: now } });
        
        const invoiceId = generateInvoiceNumber(sub.id);
        await pushPaymentToCloud({
            invoiceId, email: user.email, amount: parseFloat(amount),
            billingDate: now.toLocaleDateString(),
            devicesCount: user.vehicles.length, status: 'SUCCESSFUL (CASH SETTLE/GAETWAY)'
        });
        res.json({ message: 'Sovereign Settle Success', invoiceId });
    } catch (err) {
        res.status(500).json({ error: err.message }); 
    }
};

const adminUpdateRegistration = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    const { vehicleId, registrationDate } = req.body;
    try {
        const updated = await prisma.vehicle.update({ where: { id: vehicleId }, data: { registrationDate: new Date(registrationDate) } });
        res.json({ message: 'RegSync Success', vehicle: updated });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getMyBill, adminUpdateRegistration, settleCash, getAdminAnalytics, getAllUsersLedger, updateGatewayConfig, PLANS };