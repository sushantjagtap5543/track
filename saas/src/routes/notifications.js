const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Fetch latest notifications for the current user
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * Mark a notification as read
 */
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        await prisma.notification.update({
            where: { id: req.params.id, userId: req.user.userId },
            data: { isRead: true }
        });
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
