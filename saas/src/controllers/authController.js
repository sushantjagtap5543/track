// src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const geosurepathService = require('../services/geosurepath');

const prisma = new PrismaClient();

exports.register = async (req, res) => {
  let { name, email, phone, password, vehicleName, vehicleType, vehiclePlate, deviceImei } = req.body;
  
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  email = email.toLowerCase().trim();
  name = name?.trim();

  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use Prisma transaction if possible, but GeoSurePath API calls aren't transactional with our DB.
    // Order: Create GeoSurePath User -> Create GeoSurePath Device -> Link -> Create local user/vehicle
    
    // 2. Create User in GeoSurePath
    let geosurepathUser;
    try {
      geosurepathUser = await geosurepathService.createUser(name, email, password);
    } catch (err) {
      if (err.message && /duplicate|unique/i.test(err.message)) {
        throw new Error('Email is already registered. Please login.');
      }
      throw err;
    }
    
    // 3. Create Device in GeoSurePath
    let geosurepathDevice;
    try {
      geosurepathDevice = await geosurepathService.createDevice(vehicleName, deviceImei);
    } catch (err) {
      // Rollback: Delete the orphaned GeoSurePath user
      console.warn(`Rolling back: Deleting GeoSurePath User ${geosurepathUser.id} due to device creation failure.`);
      await geosurepathService.deleteUser(geosurepathUser.id).catch(e => console.error('Rollback cleanup failed:', e));
      
      if (err.message && /duplicate|unique/i.test(err.message)) {
        throw new Error('Device IMEI is already registered. Please use a different device or login.');
      }
      throw err;
    }
    
    // 4. Link Device to User in GeoSurePath
    try {
      await geosurepathService.linkDeviceToUser(geosurepathUser.id, geosurepathDevice.id);
    } catch (err) {
      // Rollback: Delete both user and device to keep data consistent
      console.warn(`Rolling back: Deleting GeoSurePath User ${geosurepathUser.id} and Device ${geosurepathDevice.id} due to linking failure.`);
      await geosurepathService.deleteDevice(geosurepathDevice.id).catch(e => console.error('Rollback cleanup failed:', e));
      await geosurepathService.deleteUser(geosurepathUser.id).catch(e => console.error('Rollback cleanup failed:', e));
      throw err;
    }

    // 5. Create local User and Vehicle record
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        geosurepathUserId: geosurepathUser.id,
        vehicles: {
          create: [{
            name: vehicleName,
            imei: deviceImei,
            type: vehicleType,
            model: vehiclePlate,
            geosurepathDeviceId: geosurepathDevice.id
          }]
        }
      },
      include: {
        vehicles: true
      }
    });

    res.status(201).json({ message: 'Registration successful', user });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Final generic fallback error message
    let errorMessage = 'Registration failed. Please try again.';
    if (error.message) {
      if (/duplicate|unique|already exists/i.test(error.message)) {
        errorMessage = 'Email or Device IMEI is already registered. Please login or use different details.';
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({ error: errorMessage, details: error.message });
  }
};

exports.login = async (req, res) => {
  let { email, password, ipAddress, device } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email/Phone and password are required' });
  
  const identifier = email.toLowerCase().trim();

  try {
    // Search for user by email OR phone number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    // Log the attempt
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        device,
        success: isMatch
      }
    });

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is locked or suspended' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, geosurepathUserId: user.geosurepathUserId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.json({ message: 'Login successful', token, email: user.email, role: user.role, geosurepathUserId: user.geosurepathUserId });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update SaaS DB
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    // Update Traccar Engine
    if (user.geosurepathUserId) {
      try {
        await geosurepathService.updateUser(user.geosurepathUserId, { password: newPassword });
        console.log(`[Sync] Password updated in Traccar for ${user.email}`);
      } catch (syncError) {
        console.error(`[Sync Error] Failed to update password in Traccar for ${user.email}:`, syncError.message);
        // We might want to warn the user that Traccar session might still use old password
      }
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to update password', details: error.message });
  }
};
