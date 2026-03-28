// src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const geosurepathService = require('../services/geosurepath');
const { emailQueue } = require('../services/queue');
const { getPlans } = require('./billingController');

const prisma = new PrismaClient();

exports.register = async (req, res) => {
  let { name, email, phone, password, vehicleName, vehicleType, vehiclePlate, deviceImei } = req.body;
  
  if (!email || !password || !name || !vehicleName || !deviceImei) {
    return res.status(400).json({ error: 'Name, Email, Password, Vehicle Name, and Device IMEI are required.' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  email = email.toLowerCase().trim();
  name = name?.trim();

  let createdTraccarUser = null;
  let createdTraccarDevice = null;

  try {
    // 1. Check if user already exists in SaaS
    const existingSaasUser = await prisma.user.findUnique({ where: { email } });
    if (existingSaasUser) {
      return res.status(400).json({ error: 'An account with this email already exists in our billing system. Please login.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Core Engine Sync (Traccar)
    let traccarUserId;
    try {
      // Attempt to create user
      const gUser = await geosurepathService.createUser(name, email, password);
      traccarUserId = gUser.id;
      createdTraccarUser = gUser.id; 
    } catch (err) {
      // If user exists in Traccar, we AUTO-LINK instead of erroring
      if (/duplicate|unique|already exists|exists/i.test(err.message)) {
        console.log(`[Register] User ${email} already exists in Traccar. Attempting to link...`);
        // We need to find the user ID. Since we don't have a 'findUserByEmail' helper yet, 
        // we'll rely on the error message or just assume we'll link it via the email later 
        // OR we can add a helper. For now, let's assume they MUST login if they exist.
        // Actually, let's just let them know they should login and use the 'Sync' feature.
        return res.status(400).json({ error: 'This email is already registered in our core system. Please LOGIN and your billing profile will be automatically created.' });
      }
      throw err;
    }
    
    // 3. Create Device in Traccar
    try {
      const gDevice = await geosurepathService.createDevice(vehicleName, deviceImei);
      createdTraccarDevice = gDevice.id;
      await geosurepathService.linkDeviceToUser(traccarUserId, gDevice.id);
      
      // 4. Create local User and Vehicle record
      const user = await prisma.user.create({
        data: {
          name, email, phone, password: hashedPassword,
          geosurepathUserId: traccarUserId,
          isActive: true,
          vehicles: {
            create: [{
              name: vehicleName, imei: deviceImei,
              type: vehicleType || 'car', plate: vehiclePlate,
              geosurepathDeviceId: gDevice.id
            }]
          },
          subscriptions: {
            create: {
              price: 0, 
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 day trial
              status: 'ACTIVE'
            }
          }
        }
      });

      res.status(201).json({ message: 'Registration successful!', user: { id: user.id, email: user.email } });

    } catch (err) {
      // Rollback newly created Traccar resources if subsequent steps fail
      console.error('[Register Rollback] Cleaning up Traccar resources due to failure...');
      if (createdTraccarDevice) await geosurepathService.deleteDevice(createdTraccarDevice).catch(e => console.error(e));
      if (createdTraccarUser) await geosurepathService.deleteUser(createdTraccarUser).catch(e => console.error(e));
      throw err;
    }

  } catch (error) {
    console.error('[SaaS] Registration failure:', error);
    res.status(500).json({ error: 'Registration failed.', details: error.message });
  }
};

exports.login = async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  const identifier = email.toLowerCase().trim();

  try {
    let user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
      include: {
        vehicles: true,
        subscriptions: { where: { status: 'ACTIVE' }, orderBy: { expiresAt: 'desc' }, take: 1 }
      }
    });
    
    let isMatch = false;
    if (user) {
      isMatch = await bcrypt.compare(password, user.password);
    }

    // --- LAZY PASSWORD SYNC ---
    // If SaaS match fails, check against Core Engine (Traccar)
    if (!isMatch) {
       console.log(`[Login] Local password mismatch for ${identifier}. Checking Core Engine...`);
       try {
         const params = new URLSearchParams();
         params.append('email', identifier);
         params.append('password', password);

         const coreRes = await fetch(`${process.env.GEOSUREPATH_URL}/api/session`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
           body: params
         });

         if (coreRes.ok) {
           const traccarUser = await coreRes.json();
           console.log(`[Login] Core Engine verified ${identifier}. Synchronizing credentials...`);
           
           const newHashedPassword = await bcrypt.hash(password, 10);
           
           if (user) {
             // Update existing user password
             user = await prisma.user.update({
               where: { id: user.id },
               data: { password: newHashedPassword },
               include: { vehicles: true, subscriptions: { where: { status: 'ACTIVE' }, orderBy: { expiresAt: 'desc' }, take: 1 } }
             });
           } else {
             // If user doesn't exist in SaaS at all, we could auto-provision here too, 
             // but let's stick to existing logic where they should 'Sync' or handle it in syncSession.
             // Actually, for better UX, let's trigger a one-time sync here.
             return res.status(401).json({ error: 'Account not found in billing. Please use the "Sync" link on the home page once to link your profile.' });
           }
           isMatch = true;
         }
       } catch (coreErr) {
         console.error('[Login] Core Engine verification failed:', coreErr.message);
       }
    }

    // Log login attempt
    if (user) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: req.ip,
          device: req.headers['user-agent'],
          success: isMatch
        }
      }).catch(e => console.error('History log failed:', e.message));
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      // Auto-reactivate if they have a valid subscription (Billing Guard logic)
      const activeSub = user.subscriptions[0];
      const now = new Date();
      if (activeSub && now < new Date(activeSub.expiresAt)) {
        user = await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
      } else {
        return res.status(403).json({ error: 'Account is suspended due to overdue bill. Please pay to reactivate.' });
      }
    }

    const activeSub = user.subscriptions[0];
    const isExpired = activeSub ? new Date() > new Date(activeSub.expiresAt) : true;

    const token = jwt.sign(
      { userId: user.id, role: user.role, geosurepathUserId: user.geosurepathUserId },
      process.env.JWT_SECRET || 'geosurepath_secret_2025',
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, geosurepathUserId: user.geosurepathUserId },
      subscription: { isActive: !isExpired, expiresAt: activeSub?.expiresAt || null },
      vehicles: user.vehicles
    });

  } catch (error) {
    console.error('[SaaS] Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
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

exports.syncSession = async (req, res) => {
  try {
    const cookie = req.headers.cookie;
    if (!cookie) return res.status(401).json({ error: 'No active session cookie found.' });

    // The SaaS API verifies the session by calling Traccar internal IP directly
    const response = await fetch(`${process.env.GEOSUREPATH_URL}/api/session`, {
      method: 'GET',
      headers: { cookie }
    });

    if (!response.ok) return res.status(401).json({ error: 'Parent session invalid or expired.' });

    const traccarUser = await response.json();
    const email = traccarUser.email.toLowerCase().trim();

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone: email }]
      },
      include: { vehicles: true }
    });

    // --- AUTO-PROVISIONING LOGIC ---
    if (!user) {
      console.log(`[Auto-Sync] Provisioning new SaaS profile for ${email}...`);
      
      // 1. Fetch user devices from Traccar
      const traccarDevices = await geosurepathService.getUserDevices(traccarUser.id);
      
      // 2. Create User in SaaS DB
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day initial grace period for auto-sync users

      user = await prisma.user.create({
        data: {
          name: traccarUser.name || email.split('@')[0],
          email,
          password: await bcrypt.hash(Math.random().toString(36).slice(-10), 10), // Random password for sync'd accounts
          geosurepathUserId: traccarUser.id,
          role: traccarUser.administrator ? 'ADMIN' : 'CLIENT',
          isActive: !traccarUser.disabled,
          vehicles: {
            create: traccarDevices.map(d => ({
              name: d.name,
              imei: d.uniqueId,
              geosurepathDeviceId: d.id
            }))
          },
          subscriptions: {
            create: {
              price: 0,
              expiresAt,
              status: 'ACTIVE'
            }
          }
        },
        include: { vehicles: true }
      });
      console.log(`[Auto-Sync] Successfully provisioned ${user.id} with ${traccarDevices.length} devices.`);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, geosurepathUserId: user.geosurepathUserId },
      process.env.JWT_SECRET || 'geosurepath_secret_2025',
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.json({ 
      message: 'Session hyper-synchronized successfully.', 
      token, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        geosurepathUserId: user.geosurepathUserId
      },
      vehicles: user.vehicles 
    });

  } catch (error) {
    console.error('[SaaS] Session Sync Error:', error.message);
    res.status(500).json({ error: 'Hyper-Sync failed', details: error.message });
  }
};