// saas/src/controllers/webhookController.js
const prisma = require('../lib/prisma');
const socketService = require('../services/socketService');

/**
 * Handles webhooks from Traccar tracking engine.
 * Traccar can be configured to forward "device" status/addition/deletion events.
 */
exports.handleTraccarLifecycle = async (req, res) => {
  const event = req.body;
  
  // Traccar forwards "device" object on addition/deletion/update
  // req.body might look like: { device: { id: 123, uniqueId: '...', name: '...', ... }, event: 'deviceAdded' }
  // Note: Standard Traccar forwarding (positions/events) is handled in notifications.js.
  // This is a specialized handler for lifecycle sync.

  const { device, event: eventType } = event;

  if (!device || !device.uniqueId) {
    return res.status(400).json({ error: 'Invalid event payload' });
  }

  try {
    const imei = String(device.uniqueId);
    
    if (eventType === 'deviceAdded' || eventType === 'deviceUpdated') {
      // Find which user this device belongs to by checking Traccar permissions or existing SaaS mapping
      // If we don't know the user, we might need to query Traccar for the device's owners.
      // For now, if it exists in SaaS, we update it. If not, we'll need to sync it on the next admin load.
      
      const existing = await prisma.vehicle.findUnique({ where: { imei } });
      if (existing) {
        await prisma.vehicle.update({
          where: { imei },
          data: { name: device.name, isActive: !device.disabled }
        });
        
        // Notify admin via socket that a device was updated/added
        socketService.emitToAdmin('device_lifecycle_update', {
          type: 'UPDATE',
          imei,
          name: device.name,
          userId: existing.userId
        });
      }
    } else if (eventType === 'deviceRemoved') {
      const existing = await prisma.vehicle.findUnique({ where: { imei } });
      if (existing) {
        await prisma.vehicle.update({
          where: { imei },
          data: { deletedAt: new Date(), isActive: false }
        });

        socketService.emitToAdmin('device_lifecycle_update', {
          type: 'DELETE',
          imei,
          userId: existing.userId
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[TraccarWebhook] Critical Error:', error.message);
    res.status(500).send('Internal Error');
  }
};
