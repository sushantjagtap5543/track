// src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const geosurepathService = require('../services/geosurepath');
const { emailQueue } = require('../services/queue');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET environment variable is not set.');
}
const JWT_EXPIRATION = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper: Generate Tokens
const generateTokens = async (userId, role, geosurepathUserId) => {
  const accessToken = jwt.sign(
    { userId, role, geosurepathUserId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION)
    }
  });

  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  let { name, username, email, phone, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, Email, and Password are required.' });
  }

  // Validations
  if (name.length > 50) return res.status(400).json({ error: 'Name must be less than 50 characters' });
  if (username && username.length > 50) return res.status(400).json({ error: 'Username must be less than 50 characters' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  // Password complexity: Min 8 chars, at least 1 number. Special chars allowed but not strictly part of regex to avoid exclusion.
  const passwordRegex = /^(?=.*[0-9]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include at least one number.' });
  }

  if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  email = email.toLowerCase().trim();
  name = name.trim();
  username = username?.toLowerCase().trim();

  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: username || undefined }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email or Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create Traccar User with both name and username if available
    const gUser = await geosurepathService.createUser(name, email, password, { 
      phone, 
      login: username || email // ✅ REFINEMENT: Prefer username as login for Traccar if provided
    });

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name,
          username,
          email,
          phone,
          password: hashedPassword,
          geosurepathUserId: gUser.id,
          role: 'CLIENT',
          isActive: true,
          subscriptions: {
            create: {
              price: 0,
              deviceCount: 5, // ✅ FIX: Default trial gives coverage for up to 5 units
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
              status: 'ACTIVE'
            }
          }
        }
      });
    } catch (prismaError) {
      console.error('[Register] Prisma creation failed, cleaning up Traccar user:', gUser.id);
      await geosurepathService.deleteUser(gUser.id).catch(() => {});
      throw prismaError;
    }

    // ✅ FIX: Send welcome email with login details
    emailQueue.add('welcome-email', {
      to: user.email,
      subject: 'Welcome to GeoSurePath - Your Fleet is Secure',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #3b82f6; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to GeoSurePath</h1>
          </div>
          <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>We're excited to have you on board! Your account has been successfully created, and your <strong>30-day trial</strong> is now active.</p>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #cbd5e1;">
              <h3 style="margin-top: 0; color: #3b82f6; font-size: 18px;">Your Login Details</h3>
              <p style="margin-bottom: 8px;"><strong>Login ID:</strong> ${user.email}</p>
              <p style="margin-top: 0;"><strong>Password:</strong> ${password}</p>
              <p style="font-size: 0.85rem; color: #64748b; margin-top: 12px;"><em>Note: For security, we recommend changing your password after your first login.</em></p>
            </div>

            <p><strong>Next Steps:</strong></p>
            <ul style="padding-left: 20px;">
              <li>Login to your dashboard to add your vehicles.</li>
              <li>Configure your alert preferences for maximum security.</li>
              <li>Install our mobile app for real-time tracking on the go.</li>
            </ul>

            <div style="text-align: center; margin-top: 32px;">
              <a href="${process.env.FRONTEND_URL || '#'}/login" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Get Started</a>
            </div>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 0.85rem;">
            <p style="margin: 0;">Need help? Reply to this email or visit our support portal.</p>
            <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} GeoSurePath. All rights reserved.</p>
          </div>
        </div>
      `
    }).then(() => {
      console.log(`[Register] Welcome email queued for ${user.email}`);
    }).catch((err) => {
      console.error(`[Register] Failed to queue welcome email for ${user.email}:`, err.message);
    });

    res.status(201).json({ message: 'Registration successful!', userId: user.id });
  } catch (error) {
    // SECURITY: Do not log the full error or req.body to avoid sensitive data exposure
    console.error('[Register] Error occurred during user creation:', error.message); 
    res.status(500).json({ error: 'Registration failed.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const identifier = email.toLowerCase().trim();

  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] }
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Check account lock
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({ error: `Account is locked. Try again after ${user.lockUntil.toISOString()}` });
    } else if (user.lockUntil && user.lockUntil <= new Date()) {
      // ✅ FIX: Lock expired, reset attempts
      await prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockUntil: null } });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const attempts = user.loginAttempts + 1;
      let lockUntil = null;
      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { loginHistory: { create: { ipAddress: req.ip, success: false, device: req.headers['user-agent'] } }, loginAttempts: attempts, lockUntil }
      });

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Success - Reset attempts and update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        loginAttempts: 0, 
        lockUntil: null, 
        lastLoginAt: new Date(),
        loginHistory: { create: { ipAddress: req.ip, success: true, device: req.headers['user-agent'] } } 
      }
    });

    if (!user.isActive) return res.status(403).json({ error: 'Account is suspended.' });
    
    // Check if verified (Fix 7)
    if (!user.isVerified && process.env.REQUIRE_VERIFICATION === 'true') {
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role, user.geosurepathUserId);

    const isSecure = process.env.SECURE_COOKIES === 'true';
    res.cookie('token', accessToken, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRATION });

    // ✅ NEW: Silent Traccar Login and Cookie Relay
    try {
      const traccarSession = await geosurepathService.loginUser(identifier, password);
      if (traccarSession.cookie) {
        // Extract session ID and set it as JSESSIONID. Traccar expects this.
        const jsessionid = traccarSession.cookie.split('=')[1];
        res.cookie('JSESSIONID', jsessionid, { 
          httpOnly: true, 
          secure: isSecure, 
          sameSite: 'lax', 
          path: '/' 
        });
        console.log(`[Login] Relayed Traccar session cookie for ${identifier}`);
      }
    } catch (traccarError) {
      console.warn(`[Login] Traccar silent login failed for ${identifier}. This may cause map access issues. Error: ${traccarError.message}`);
    }

    res.json({
      message: 'Login successful',
      accessToken, // ✅ FIX: Return token for localStorage persistence
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('[Login] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  try {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Rotate tokens
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    const tokens = await generateTokens(storedToken.user.id, storedToken.user.role, storedToken.user.geosurepathUserId);

    const isSecure = process.env.SECURE_COOKIES === 'true';
    res.cookie('token', tokens.accessToken, { httpOnly: true, secure: isSecure, sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: isSecure, sameSite: 'strict', maxAge: REFRESH_TOKEN_EXPIRATION });

    res.json({ message: 'Token refreshed', accessToken: tokens.accessToken });
  } catch (error) {
    res.status(500).json({ error: 'Refresh failed' });
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } }).catch(() => {});
  }
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: expires }
    });

    emailQueue.add('reset-password', {
      to: user.email,
      subject: 'Reset Your GeoSurePath Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h2 style="color: #3b82f6;">Password Reset Request</h2>
          <p>You requested a password reset for your GeoSurePath account. Please use the token below to complete the process:</p>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0;">
            <span style="font-size: 1.5rem; font-weight: bold; letter-spacing: 2px;">${token}</span>
          </div>
          <p style="color: #64748b; font-size: 0.85rem;">This token will expire in 1 hour. If you did not request this, you can safely ignore this email.</p>
        </div>
      `
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Error processing forgot password' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });

  try {
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpires: { gt: new Date() } }
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpires: null }
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Error resetting password' });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect current password' });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
};

exports.syncSession = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        isVerified: true,
        isActive: true,
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.cookies.token;

    res.json({
      message: 'Session synchronized',
      user,
      token // ✅ FIX: Allow frontend to persist token from synced session
    });
  } catch (error) {
    console.error('[SyncSession] Error:', error);
    res.status(500).json({ error: 'Failed to sync session' });
  }
};