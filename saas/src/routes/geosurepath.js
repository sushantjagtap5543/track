const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { alertQueue } = require('../services/queue');
const fcmService = require('../services/fcm');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * Endpoint to receive forwarded events from Traccar
 * Traccar sends: event (type), position (lat, lng), device (attributes)
 */
router.post('/tokens', authenticateToken, async (req, res) => {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    try {
        await prisma.deviceToken.upsert({
            where: { token },
            update: { updatedAt: new Date() },
            create: {
                userId: req.user.userId,
                token,
                platform
            }
        });
        res.status(200).json({ status: 'ok', message: 'Token registered' });
    } catch (error) {
        console.error('Error registering FCM token:', error);
        res.status(500).json({ error: 'Failed to register token' });
    }
});

router.post('/events', async (req, res) => {
    const { event, device } = req.body;

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
            message = `SECURITY ALERT: ${vehicle.name} has moved out of its Safe Parking zone!`;
        }

        // Potential tampering based on alarm or ignition
        if (event.type === 'alarm' && (event.attributes.alarm === 'tampering' || event.attributes.alarm === 'powerCut')) {
            type = "TAMPERING";
            message = `TAMPERING ALERT: Potential tampering detected on ${vehicle.name}! (${event.attributes.alarm})`;
        }

        await prisma.notification.create({
            data: {
                userId: vehicle.userId,
                type: type,
                message: message
            }
        });

        // Trigger Push Notification
        fcmService.sendToUser(vehicle.userId, {
            title: `GeoSurePath: ${type.replace(/_/g, ' ')}`,
            body: message,
            data: {
                vehicleId: vehicle.id,
                type: type,
                eventId: event.id.toString()
            }
        });

        // 5. Custom Alert Rules Processing
        if (event.type === 'geofenceEnter') {
            const rules = await prisma.alertRule.findMany({
                where: { vehicleId: vehicle.id, type: 'AREA_STAY', isActive: true }
            });

            for (const rule of rules) {
                const params = rule.parameters;
                // rule.parameters example: { "geofenceId": 123, "durationMinutes": 30 }
                if (params.geofenceId === event.geofenceId) {
                    await alertQueue.add('check-stay-duration', {
                        userId: vehicle.userId,
                        vehicleId: vehicle.id,
                        geofenceId: event.geofenceId,
                        durationMinutes: params.durationMinutes || 30,
                        ruleId: rule.id
                    }, { delay: (params.durationMinutes || 30) * 60 * 1000 });
                    
                    console.log(`[AlertQueue] Queued stay-duration check for vehicle ${vehicle.name} in geofence ${event.geofenceId}`);
                }
            }
        }

        console.log(`[Alert] processed event ${event.type} for ${vehicle.user.email}`);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error processing GeoSurePath event:', error);
        res.sendStatus(500);
    }
});

module.exports = router;