// src/controllers/userController.js
const prisma = require('../lib/prisma');

exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, name: true, email: true, username: true, role: true,
        phone: true, avatarUrl: true, timezone: true, createdAt: true
      }
    });

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, phone, timezone, avatarUrl } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(timezone && { timezone }),
        ...(avatarUrl && { avatarUrl })
      },
      select: {
        id: true, name: true, email: true, username: true,
        phone: true, avatarUrl: true, timezone: true, geosurepathUserId: true
      }
    });

    // ✅ REFINEMENT: Sync profile updates to GeoSurePath
    if (user.geosurepathUserId) {
      geosurepathService.updateUser(user.geosurepathUserId, { 
        name: user.name, 
        phone: user.phone || undefined 
      }).catch(err => console.error('[Profile Sync] Failed to sync to Traccar:', err.message));
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user?.geosurepathUserId) {
        geosurepathService.updateUser(user.geosurepathUserId, { disabled: true }).catch(err => console.error('[DeleteAccount Sync] Failed to sync to Traccar:', err.message));
    }
    
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { deletedAt: new Date(), isActive: false }
    });

    res.json({ message: 'Account deleted successfully (Soft delete)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
