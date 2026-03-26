const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/** 
 * 📈 GeoSurePath Master Pricing Tiers (INR)
 * Monthly: ₹200 | Half-Yearly: ₹1000 | Yearly: ₹2000
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
        // Find the last subscription specifically for this device or user
        const lastSub = user.subscriptions[0];
        const lastPaidDate = lastSub ? new Date(lastSub.createdAt) : regDate;
        
        const unpaidTime = Math.abs(now - lastPaidDate);
        const unpaidDays = Math.ceil(unpaidTime / (1000 * 60 * 60 * 24));
        
        const DAILY_RATE_BASE = 6.66;
        const amount = unpaidDays * DAILY_RATE_BASE;

        return {
            imei: v.imei,
            name: v.name,
            registrationDate: v.registrationDate,
            previousBillingDate: lastPaidDate, // Explicit historical record
            unpaidDays,
            amount: parseFloat(amount.toFixed(2))
        };
    });

    const totalDue = deviceDetails.reduce((sum, d) => sum + d.amount, 0);

    return {
        totalDue: parseFloat(totalDue.toFixed(2)),
        currency: 'INR',
        plans: PLANS.map(p => ({
            ...p,
            costPerDay: parseFloat((p.price / p.days).toFixed(2)),
            totalForFleet: parseFloat((p.price * user.vehicles.length).toFixed(2))
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

module.exports = { getMyBill, adminUpdateRegistration, PLANS };