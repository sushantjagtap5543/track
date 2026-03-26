const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/** 
 * 📈 GeoSurePath Master Pricing Tiers (INR)
 */
const PLANS = [
    { id: 'monthly', name: 'Standard Monthly', days: 30, price: 200, discount: 0 },
    { id: 'half_yearly', name: 'Safe Shield (6 Months)', days: 180, price: 1000, discount: 16.7 },
    { id: 'yearly', name: 'Guardian Pro (1 Year)', days: 365, price: 2000, discount: 16.7 }
];

const calculateBillForUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { vehicles: true, subscriptions: { orderBy: { createdAt: 'desc' } } }
    });
    if (!user) throw new Error("User not found");

    const now = new Date();
    const deviceDetails = user.vehicles.map(v => {
        const regDate = new Date(v.registrationDate);
        const lastSub = user.subscriptions[0];
        const lastPaidDate = lastSub ? new Date(lastSub.createdAt) : regDate;
        
        const diffTime = Math.max(0, now - lastPaidDate);
        const unpaidDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const DAILY_RATE_BASE = 6.66;
        const amount = unpaidDays * DAILY_RATE_BASE;

        return {
            imei: v.imei,
            name: v.name,
            registrationDate: v.registrationDate,
            previousBillingDate: lastPaidDate,
            unpaidDays,
            amount: parseFloat(amount.toFixed(2))
        };
    });

    const totalDue = deviceDetails.reduce((sum, d) => sum + d.amount, 0);

    return {
        userId: user.id, // For admin settled actions
        totalDue: parseFloat(totalDue.toFixed(2)),
        currency: 'INR',
        plans: PLANS.map(p => ({
            ...p,
            costPerDay: parseFloat((p.price / p.days).toFixed(2)),
        })),
        devices: deviceDetails,
        nextBillingDate: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    };
};

const getMyBill = async (req, res) => {
    try {
        const bill = await calculateBillForUser(req.user.userId);
        res.json(bill);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const settleCash = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    
    const { targetUserId, planId, amount } = req.body;
    try {
        // Record manual cash subscription
        const sub = await prisma.subscription.create({
            data: {
                userId: targetUserId,
                planId: planId,
                amount: parseFloat(amount),
                paymentId: `CASH_${Date.now()}`,
                status: 'ACTIVE'
            }
        });
        
        // Update all vehicles registration date to 'today' to reset accrual
        // This synchronizes them to the next cycle
        const now = new Date();
        await prisma.vehicle.updateMany({
            where: { userId: targetUserId },
            data: { registrationDate: now }
        });

        res.json({ message: 'Cash payment settled and fleet synchronized', subscription: sub });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const adminUpdateRegistration = async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    const { vehicleId, registrationDate } = req.body;
    try {
        const updated = await prisma.vehicle.update({
            where: { id: vehicleId },
            data: { registrationDate: new Date(registrationDate) }
        });
        res.json({ message: 'Registration date updated', vehicle: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getMyBill, adminUpdateRegistration, settleCash, PLANS };