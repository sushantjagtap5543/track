const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Endpoint to receive forwarded events from Traccar
 * Traccar sends: event (type), position (lat, lng), device (attributes)
 */
router.post('/events', async (req, res) => {
    const { event, position, device } = req.body;

    if (!event || !device) return res.sendStatus(200); // Silent success

    try {
        // Find local user linked to this device
        const vehicle = await prisma.vehicle.findFirst({
            where: { geosurepathDeviceId: device.id },
            include: { user: true }
        });

        if (!vehicle) return res.sendStatus(200);

        let type = "GENERIC";
        let message = `Alert for ${vehicle.name}: ${event.type}`;

        // Specialized handling for Safe Parking
        if (event.type === 'geofenceExit' && event.attributes.name && event.attributes.name.startsWith('SafeParking')) {
            type = "SAFE_PARKING_BREACH";
            message = `🚨 SECURITY ALERT: ${vehicle.name} has moved out of its Safe Parking zone!`;
        }

        // Potential tampering based on alarm or ignition
        if (event.type === 'alarm' && (event.attributes.alarm === 'tampering' || event.attributes.alarm === 'powerCut')) {
            type = "TAMPERING";
            message = `⚠️ TAMPERING ALERT: Potential tampering detected on ${vehicle.name}! (${event.attributes.alarm})`;
        }

        // Store notification for the user
        await prisma.notification.create({
            data: {
                userId: vehicle.userId,
                type: type,
                message: message
            }
        });

        console.log(`[Alert] Sent notification to ${vehicle.user.email}: ${message}`);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing GeoSurePath event:', error);
        res.sendStatus(500);
    }
});

module.exports = router;
