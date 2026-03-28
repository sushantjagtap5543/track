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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });

  if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  email = email.toLowerCase().trim();
  name = name?.trim();
  username = username?.toLowerCase().trim();

  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: username || undefined }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email or Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create Traccar User
    const gUser = await geosurepathService.createUser(name, email, password);

    const user = await prisma.user.create({
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
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
            status: 'ACTIVE'
          }
        }
      }
    });

    emailQueue.add('welcome-email', {
      to: user.email,
      subject: 'Welcome to GeoSurePath!',
      html: `<h3>Welcome, ${user.name}!</h3><p>Your account is ready.</p>`
    }).catch(() => {}); // Silent fail for email in dev

    res.status(201).json({ message: 'Registration successful!', userId: user.id });
  } catch (error) {
    // SECURITY: Do not log the full error or req.body to avoid sensitive data exposure (Fix 18)
    console.error('[Register] Error occurred during user creation'); 
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

    // Success - Reset attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockUntil: null, loginHistory: { create: { ipAddress: req.ip, success: true, device: req.headers['user-agent'] } } }
    });

    if (!user.isActive) return res.status(403).json({ error: 'Account is suspended.' });
    
    // Check if verified (Fix 7)
    if (!user.isVerified && process.env.REQUIRE_VERIFICATION === 'true') {
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role, user.geosurepathUserId);

    res.cookie('token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: REFRESH_TOKEN_EXPIRATION });

    res.json({
      message: 'Login successful',
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

    res.cookie('token', tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: REFRESH_TOKEN_EXPIRATION });

    res.json({ message: 'Token refreshed' });
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
      subject: 'Password Reset',
      html: `<p>Use this token to reset your password: <b>${token}</b></p>`
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
  // Keeping syncSession for compatibility, but updating it to use local logic
  // ... (implementation same as before but adapted for new schema if needed)
  res.status(501).json({ error: 'Sync session not implemented in new auth flow' });
};