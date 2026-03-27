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
  
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  // Basic Regex Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[\d\s-]{10,15}$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (phone && !phoneRegex.test(phone)) return res.status(400).json({ error: 'Invalid phone number format' });
  if (deviceImei && deviceImei.length < 5) return res.status(400).json({ error: 'Device IMEI too short' });

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

    // 2. Create User in GeoSurePath
    let geosurepathUser;
    try {
      geosurepathUser = await geosurepathService.createUser(name, email, password);
    } catch (err) {
      const errorText = err.message || '';
      if (/duplicate|unique|already exists|exists/i.test(errorText)) {
        return res.status(400).json({ error: 'This email is already registered in our system. Please login instead.' });
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
        throw new Error('Device IMEI is already registered. Please use a different device or login.', { cause: err });
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
    try {
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
              plate: vehiclePlate,
              geosurepathDeviceId: geosurepathDevice.id
            }]
          }
        },
        include: {
          vehicles: true
        }
      });

      // 6. Create Initial Subscription linked to an actual Database Plan
      const plans = await getPlans();
      const standardPlan = plans.find(p => p.billingCycle === 'YEARLY' || p.name?.toLowerCase().includes('yearly')) || plans[0] || { price: 2000, days: 365, id: undefined };
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ((standardPlan.days || 365) * 24 * 60 * 60 * 1000));
      
      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: standardPlan.id,
          price: standardPlan.price,
          status: 'ACTIVE',
          expiresAt
        }
      });

      // 7. Calculate Billing Breakdown for Email
      const total = standardPlan.price;
      const baseValue = total / 1.18;
      const gstValue = total - baseValue;
      const serverCharge = baseValue * 0.15;
      const cloudCharge = baseValue * 0.10;
      const basicAccess = baseValue - serverCharge - cloudCharge;

      // 8. Queue Welcome Email
      const billingDateStr = expiresAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      
      try {
        await emailQueue.add('welcome-email', {
          to: email,
          subject: 'Welcome to GeoSurePath - Your Fleet is Now Protected!',
          html: `
            <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
              <h2 style="color: #2563eb;">Welcome to GeoSurePath, ${name}!</h2>
              <p>Your registration is successful. You can now track your vehicle <strong>${vehicleName}</strong> (IMEI: ${deviceImei}) in real-time.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Login Credentials</h3>
                <p><strong>Email ID:</strong> ${email}</p>
                <p style="font-size: 0.9em; color: #666;"><em>Please change your password after your first login for security.</em></p>
              </div>

              <h3>Billing Information</h3>
              <p>Your <strong>Guardian Pro (1 Year) Plan</strong> has been activated.</p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0;">Basic Access Fee</td>
                  <td style="text-align: right;">₹${basicAccess.toFixed(2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0;">AI-Guardian Server Charge</td>
                  <td style="text-align: right;">₹${serverCharge.toFixed(2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0;">Cloud Storage & API</td>
                  <td style="text-align: right;">₹${cloudCharge.toFixed(2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0;">GST (18%)</td>
                  <td style="text-align: right;">₹${gstValue.toFixed(2)}</td>
                </tr>
                <tr style="font-weight: bold; font-size: 1.2em;">
                  <td style="padding: 15px 0;">Total Amount Paid</td>
                  <td style="text-align: right;">₹${total.toFixed(2)}</td>
                </tr>
              </table>

              <p><strong>Next Billing Date:</strong> <span style="color: #dc2626; font-weight: bold;">${billingDateStr}</span></p>

              <p>If you have any questions, reply to this email or visit our support portal.</p>
              <p>Safe Travels,<br><strong>Team GeoSurePath</strong></p>
            </div>
          `
        });
      } catch (emailErr) {
        console.warn('Welcome email queuing failed - user created but no email sent:', emailErr.message);
      }

      res.status(201).json({ 
        message: 'Registration successful. Welcome email has been sent.', 
        user,
        subscription 
      });
    } catch (err) {
      // Rollback: Delete both user and device from GeoSurePath if local DB creation fails
      console.error('Registration Prisma Error - Rolling back GeoSurePath resources:', err);
      await geosurepathService.deleteDevice(geosurepathDevice.id).catch(e => console.error('Rollback cleanup failed:', e));
      await geosurepathService.deleteUser(geosurepathUser.id).catch(e => console.error('Rollback cleanup failed:', e));
      throw err;
    }

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

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone: email }]
      }
    });

    if (!user) return res.status(404).json({ error: 'SaaS profile not linked to this session.' });

    const token = jwt.sign(
      { userId: user.id, role: user.role, geosurepathUserId: user.geosurepathUserId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    res.json({ message: 'Session hyper-synchronized successfully.', token, email: user.email, role: user.role, geosurepathUserId: user.geosurepathUserId });

  } catch (error) {
    console.error('Session Sync Error:', error.message);
    res.status(500).json({ error: 'Hyper-Sync failed', details: error.message });
  }
};