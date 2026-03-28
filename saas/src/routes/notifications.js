// src/routes/notifications.js
// ✅ FIX 1: Prisma's `update` only allows truly unique fields in `where`. Using
//    `where: { id, userId }` caused query failures in Prisma 5+ because `userId`
//    is not a unique field on Notification. Fixed by doing a `findFirst` ownership
//    check before updating.
// ✅ FIX 2: Use shared Prisma singleton instead of `new PrismaClient()`.

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * Fetch latest notifications for the current user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * Mark a notification as read
 * ✅ FIX: Verify ownership with findFirst before updating, then update by id only.
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    // Ownership check — only the owning user can mark their notification as read
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.userId }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });

    res.json({ message: 'Marked as read' });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

module.exports = router;