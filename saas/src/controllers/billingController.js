const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 💰 GeoSurePath Master Billing Engine
 * Logic: Daily calculation per device registration, synchronized billing dates.
 */

const DAILY_RATE_PER_DEVICE = 10; // Example: ₹10 per device per day

const calculateBillForUser = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { vehicles: true, subscriptions: true }
    });

    if (!user) throw new Error("User not found");

    const now = new Date();
    let totalDue = 0;
    const deviceDetails = [];

    user.vehicles.forEach(vehicle => {
        const regDate = new Date(vehicle.registrationDate);
        const diffTime = Math.abs(now - regDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Example logic: Pay for what has been used since registration OR since last payment
        const lastSub = user.subscriptions.sort((a,b) => b.createdAt - a.createdAt)[0];
        const lastPaidDate = lastSub ? new Date(lastSub.createdAt) : regDate;
        
        const unpaidTime = Math.abs(now - lastPaidDate);
        const unpaidDays = Math.ceil(unpaidTime / (1000 * 60 * 60 * 24));

        const amount = unpaidDays * DAILY_RATE_PER_DEVICE;
        totalDue += amount;

        deviceDetails.push({
            imei: vehicle.imei,
            name: vehicle.name,
            registrationDate: vehicle.registrationDate,
            unpaidDays,
            amount
        });
    });

    return {
        totalDue,
        currency: 'INR',
        devices: deviceDetails,
        nextBillingDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()) // Synchronized monthly
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

module.exports = { getMyBill, adminUpdateRegistration };