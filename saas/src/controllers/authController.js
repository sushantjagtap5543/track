// src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const traccarService = require('../services/traccar');

const prisma = new PrismaClient();

exports.register = async (req, res) => {
  const { name, email, phone, password, vehicleName, vehicleType, vehicleModel, deviceImei } = req.body;

  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use Prisma transaction if possible, but Traccar API calls aren't transactional with our DB.
    // Order: Create Traccar User -> Create Traccar Device -> Link -> Create local user/vehicle
    
    // 2. Create User in Traccar
    let traccarUser;
    try {
      traccarUser = await traccarService.createUser(name, email, password);
    } catch (err) {
      if (err.message && /duplicate|unique/i.test(err.message)) {
        throw new Error('Email is already registered. Please login.');
      }
      throw err;
    }
    
    // 3. Create Device in Traccar
    let traccarDevice;
    try {
      traccarDevice = await traccarService.createDevice(vehicleName, deviceImei);
    } catch (err) {
      // NOTE: Normally we would delete traccarUser here to rollback the partial creation
      if (err.message && /duplicate|unique/i.test(err.message)) {
        throw new Error('Device IMEI is already registered. Please use a different device or login.');
      }
      throw err;
    }
    
    // 4. Link Device to User in Traccar
    await traccarService.linkDeviceToUser(traccarUser.id, traccarDevice.id);

    // 5. Create local User and Vehicle record
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        traccarUserId: traccarUser.id,
        vehicles: {
          create: [{
            name: vehicleName,
            imei: deviceImei,
            type: vehicleType,
            model: vehicleModel,
            traccarDeviceId: traccarDevice.id
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
    
    let errorMessage = 'Registration failed. Please try again.';
    
    if (error.message) {
      if (/duplicate|unique|already exists/i.test(error.message)) {
        errorMessage = 'Email or Device IMEI is already registered. Please login or use different details.';
      } else if (error.message.includes('Traccar')) {
        errorMessage = error.message;
      } else if (error.code === 'P2002') {
        errorMessage = 'A user or vehicle with these details already exists locally.';
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({ error: errorMessage, details: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password, ipAddress, device } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
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
      { userId: user.id, role: user.role, traccarUserId: user.traccarUserId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.json({ message: 'Login successful', token, role: user.role, traccarUserId: user.traccarUserId });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};
