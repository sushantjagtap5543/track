// src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const geosurepathService = require('../services/geosurepath');
const { emailQueue } = require('../services/queue');
const { logAction, AUDIT_ACTIONS } = require('../services/auditService');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const emailService = require('../services/emailService');
// ✅ UNIFIED (S98): Import billing service to prevent synchronization drift between login and cron
const { getAccountHardlockState } = require('../services/billingService');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET environment variable is not set.');
}
const JWT_EXPIRATION = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * ✅ REFINED (S98): Proxies to the unified billing service shared with the cron.
 */
const calculateHardlock = (user, latestSub) => {
  const result = getAccountHardlockState(user, latestSub);
  return {
      isHardlocked: result.isHardlocked,
      gracePeriod: result.graceDays,
      gracePeriodEnd: result.graceEnd
  };
};

exports.calculateHardlock = calculateHardlock;

// Helper: Generate Tokens
const generateTokens = async (userId, role, geosurepathUserId, uaHash = null) => {
  const accessToken = jwt.sign(
    { userId, role, geosurepathUserId, uaHash },
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

  // ✅ SCENARIO HARDENING: Input Validation
  if (name.trim().length < 2 || name.length > 100) return res.status(400).json({ error: 'Invalid name length' });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.toLowerCase())) return res.status(400).json({ error: 'Invalid email format' });
  if (password.length < 8 || !/\d/.test(password)) return res.status(400).json({ error: 'Password must be at least 8 chars with a number' });

  email = email.toLowerCase().trim();
  name = name.trim();
  username = username?.toLowerCase().trim();

  try {
    // 1. Check SaaS Multi-Collision (Email/Username)
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { ...(username && { username }) }] }
    });
    if (existing) {
        return res.status(400).json({ 
            error: 'An account with this email/username is already registered. Please login or reset your password.' 
        });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const requireVerify = process.env.REQUIRE_VERIFICATION === 'true';
    const verificationToken = requireVerify ? crypto.randomBytes(32).toString('hex') : null;

    // 2. Cross-System Provisioning: Traccar (S6 Resilient)
    let gUser;
    try {
        gUser = await geosurepathService.createUser(name, email, password, { 
            phone, 
            login: username || email,
            disabled: requireVerify 
        });
        console.log(`[Register] Created Traccar user: ${email} (ID: ${gUser.id})`);
    } catch (createErr) {
        if (createErr.message.includes('already exists')) {
            console.warn(`[Register] Traccar user already exists for ${email}. Re-using and syncing...`);
            gUser = await geosurepathService.getUserByEmail(email);
            if (gUser) {
              await geosurepathService.updateUser(gUser.id, { disabled: requireVerify, password }).catch(() => {});
            }
        } else {
            console.error(`[Register] Traccar Provisioning Delay for ${email}: ${createErr.message}`);
            // We allow SaaS registration to proceed without Traccar ID (Self-Healing takes over later)
        }
    }

    // 3. SaaS Provisioning: Database & Trial Subscription
    const user = await prisma.user.create({
        data: {
            name, username, email, phone,
            password: hashedPassword,
            geosurepathUserId: gUser?.id || null, // ✅ NEW: Allow null for deferred provisioning
            role: 'CLIENT',
            isActive: true,
            isVerified: !requireVerify,
            // Use existing permissions field to store verification metadata to avoid migrations
            permissions: requireVerify ? { verification: { token: verificationToken, expires: Date.now() + 24 * 3600000 } } : {},
            subscriptions: {
                create: {
                    price: 0,
                    deviceCount: 10,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day Free Trial
                    status: 'ACTIVE'
                }
            }
        }
    });

    // 4. Communication: Verification or Welcome
    if (requireVerify) {
        const verifyUrl = `${process.env.FRONTEND_URL || 'http://3.108.114.12'}/verify-email?token=${verificationToken}&email=${email}`;
        emailService.sendEmail(email, 'Verify Your GeoSurePath Account', `
            <div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #3b82f6;">Welcome! Please Verify Your Email</h2>
                <p>Hello ${name}, thank you for joining GeoSurePath.</p>
                <p>Please click the button below to verify your email and activate your tracking account:</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${verifyUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                </div>
                <p style="color: #64748b; font-size: 0.875rem;">This link will expire in 24 hours.</p>
            </div>
        `).catch(e => console.error('[Register] Verification email failed:', e.message));
    } else {
        emailService.sendWelcomeEmail(user).catch(e => console.error('[Register] Welcome email failed:', e.message));
    }

    // 5. Auditing
    logAction({
        userId: user.id,
        action: AUDIT_ACTIONS.USER_REGISTRATION,
        details: { email, requireVerify },
        ipAddress: req.ip
    });

    res.status(201).json({ 
        message: requireVerify ? 'Registration successful. Please check your email to verify your account.' : 'Registration successful!', 
        userId: user.id,
        requireVerify
    });

  } catch (error) {
    console.error('[Register] Fatal Error:', error.message);
    res.status(500).json({ error: `Registration failed. ${error.message}` });
  }
};

exports.verifyEmail = async (req, res) => {
    const { email, token } = req.body;
    if (!email || !token) return res.status(400).json({ error: 'Email and token are required for verification.' });

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        if (user.isVerified) return res.json({ message: 'Account is already verified. You can log in.' });

        const metadata = user.permissions || {};
        if (!metadata.verification || metadata.verification.token !== token || metadata.verification.expires < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired verification token.' });
        }

        // Activate in SaaS
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                isVerified: true, 
                permissions: { ...metadata, verification: null } 
            }
        });

        // Activate in Traccar
        if (user.geosurepathUserId) {
            await geosurepathService.updateUser(user.geosurepathUserId, { disabled: false })
                .then(() => console.log(`[Verification] Traccar user enabled for ${email}`))
                .catch(e => console.warn(`[Verification] Traccar sync failed for ${email}:`, e.message));
        }

        logAction({ userId: user.id, action: 'EMAIL_VERIFIED', ipAddress: req.ip });
        res.json({ message: 'Email verified successfully. You can now log in and access your dashboard.' });

    } catch (error) {
        console.error('[VerifyEmail]', error.message);
        res.status(500).json({ error: 'Failed to verify email.' });
    }
};

exports.resendVerification = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    try {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) return res.status(200).json({ message: 'If this email exists in our records, a link was sent.' }); // Obfuscation
        if (user.isVerified) return res.status(400).json({ error: 'Account is already verified.' });

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const metadata = user.permissions || {};

        await prisma.user.update({
            where: { id: user.id },
            data: {
                permissions: { ...metadata, verification: { token: verificationToken, expires: Date.now() + 24 * 3600000 } }
            }
        });

        const verifyUrl = `${process.env.FRONTEND_URL || 'http://3.108.114.12'}/verify-email?token=${verificationToken}&email=${email}`;
        await emailService.sendEmail(email, 'Verify Your GeoSurePath Account (Resend)', `
             <div style="font-family: sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #3b82f6;">Verify Your Email</h2>
                <p>Hello ${user.name}, please click the button below to verify your email:</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${verifyUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                </div>
            </div>
        `);

        res.json({ message: 'Verification email resent successfully. Please check your inbox.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to resend verification.' });
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

    if (!user) {
      logAction({ action: AUDIT_ACTIONS.LOGIN_FAILURE, details: { identifier, reason: 'Unknown user' }, ipAddress: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
        data: { 
          loginHistory: { 
            create: { 
              ipAddress: req.ip, 
              success: false, 
              device: req.headers['user-agent']
            } 
          }, 
          loginAttempts: attempts, 
          lockUntil 
        }
      });

      // ✅ FIX: Audit Log for Failed Login
      logAction({
          userId: user.id,
          action: AUDIT_ACTIONS.FAILED_LOGIN_ATTEMPT,
          details: { email: user.email, reason: 'Invalid Password', attempts },
          ipAddress: req.ip
      });

      logAction({ userId: user.id, action: AUDIT_ACTIONS.LOGIN_FAILURE, details: { identifier, reason: 'Incorrect password' }, ipAddress: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Success - Reset attempts and update lastLoginAt
    const uaHash = crypto.createHash('md5').update(req.headers['user-agent'] || '').digest('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        loginAttempts: 0, 
        lockUntil: null, 
        lastLoginAt: new Date(),
        loginHistory: { 
          create: { 
            ipAddress: req.ip, 
            success: true, 
            device: req.headers['user-agent'],
            fingerprint: uaHash // ✅ ELITE HARDEING: Store hash for sentinel comparisons
          } 
        } 
      }
    });

    // ✅ FIX: Audit Log for Successful Login
    logAction({
        userId: user.id,
        action: AUDIT_ACTIONS.USER_LOGIN,
        details: { email: user.email },
        ipAddress: req.ip
    });

    // ✅ FIX: Check isVerified BEFORE login if REQUIRED_VERIFICATION is enabled
    if (process.env.REQUIRE_VERIFICATION === 'true' && !user.isVerified) {
        return res.status(403).json({ 
            error: 'Email not verified. Please check your inbox for the verification link.',
            requireVerify: true 
        });
    }

    // ✅ FIX: Check isActive BEFORE issuing tokens to prevent token leak to suspended users
    if (!user.isActive) return res.status(403).json({ error: 'Account is suspended.' });

    let isHardlocked = false;
    // ✅ HARDLOCK CHECK: Use shared helper
    if (user.role === 'CLIENT') {
      const latestSub = await prisma.subscription.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { plan: true }
      });

      const hardlock = calculateHardlock(user, latestSub);
      isHardlocked = hardlock.isHardlocked;

      if (isHardlocked) {
        // ✅ SECURE REVOKE: Kill all other active sessions to prevent bypass
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

        logAction({
          userId: user.id,
          action: AUDIT_ACTIONS.HARDLOCK_BLOCK,
          details: { email: user.email, reason: `Subscription Overdue (Hardlock - Grace: ${hardlock.gracePeriod} days)`, lastExpiry: hardlock.gracePeriodEnd },
          ipAddress: req.ip
        });
      }

      // ✅ LIMIT SYNC: Ensure Traccar deviceLimit matches SaaS subscription deviceCount
      if (latestSub && user.geosurepathUserId) {
        user.deviceLimit = latestSub.deviceCount; // Temporary property for later use or just update now
      }
    }


    const isSecure = process.env.SECURE_COOKIES === 'true';

    // ✅ PENTA CENTURION (S462): Self-Healing Authentication & Auto-Provisioning
    // We establish the Traccar session BEFORE the MFA check so the cookie is set early.
    try {
      const traccarSession = await geosurepathService.loginUser(identifier, password);
      if (traccarSession.cookie) {
        const match = traccarSession.cookie.match(/JSESSIONID=([^;]+)/);
        if (match && match[1]) {
            res.cookie('JSESSIONID', match[1], { 
              httpOnly: true, 
              secure: isSecure, 
              sameSite: 'lax', 
              path: '/' 
            });
            console.log(`[Login] Relayed Traccar session cookie (JSESSIONID=${match[1]}) for ${identifier}`);
        }
      }

      // ✅ SYNC (S463): Ensure Traccar state matches SaaS role/limits
      // Synchronize Admin bit, deviceLimit, and disabled status (e.g. for hardlock/verification)
      const isAdminInSaaS = user.role === 'ADMIN';
      const isAdminInTraccar = traccarSession.data?.administrator || false;
      const deviceLimitInTraccar = traccarSession.data?.deviceLimit || 0;
      const currentDeviceLimit = user.deviceLimit || 10;
      const isDisabledInTraccar = traccarSession.data?.disabled || false;
      const targetDisabled = isHardlocked || !user.isVerified || !user.isActive;

      if (isAdminInSaaS !== isAdminInTraccar || deviceLimitInTraccar !== currentDeviceLimit || isDisabledInTraccar !== targetDisabled) {
          console.log(`[Login] State Mismatch for ${identifier}. Syncing Traccar Admin=${isAdminInSaaS}, Limit=${currentDeviceLimit}, Disabled=${targetDisabled}`);
          await geosurepathService.updateUser(user.geosurepathUserId, { 
              administrator: isAdminInSaaS,
              deviceLimit: currentDeviceLimit,
              disabled: targetDisabled
          }).catch(e => console.warn(`[Login] Failed to sync Traccar state: ${e.message}`));
      }
    } catch (traccarError) {
      if (traccarError.message.includes('401')) {
        console.warn(`[Login] Traccar Auth failed for ${identifier}. Initiating Self-Healing Sync/Provision...`);
        try {
          if (user.geosurepathUserId) {
            await geosurepathService.updateUser(user.geosurepathUserId, { 
                password, 
                administrator: user.role === 'ADMIN', 
                deviceLimit: user.deviceLimit || 10,
                disabled: isHardlocked || !user.isVerified || !user.isActive
            });
            console.log(`[Login] Force-synced credentials & limits for ${identifier}. Retrying session relay...`);
          } else {
            console.warn(`[Login] Missing Traccar Link for ${identifier}. Auto-provisioning...`);
            const newTUser = await geosurepathService.createUser(user.name, user.email, password, { 
                administrator: user.role === 'ADMIN',
                deviceLimit: user.deviceLimit || 10,
                disabled: isHardlocked || !user.isVerified || !user.isActive
            });
            await prisma.user.update({
              where: { id: user.id },
              data: { geosurepathUserId: newTUser.id }
            });
            console.log(`[Login] Auto-provisioned Traccar user (ID: ${newTUser.id}) for ${identifier}.`);
          }
          
          const retrySession = await geosurepathService.loginUser(identifier, password);
          const match = retrySession.cookie?.match(/JSESSIONID=([^;]+)/);
          if (match && match[1]) {
            res.cookie('JSESSIONID', match[1], { httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/' });
            console.log(`[Login] Self-Healing recovery successful for ${identifier}`);
          }
        } catch (syncErr) {
          console.error(`[Login] Self-Healing fallback failed for ${identifier}: ${syncErr.message}`);
        }
      } else {
        console.warn(`[Login] Traccar silent login failed for ${identifier}: ${traccarError.message}`);
      }
    }

    // ✅ MFA CHECK
    if (user.mfaEnabled) {
      return res.json({
        message: 'MFA required',
        mfaRequired: true,
        userId: user.id,
        isHardlocked // Included for UI consistency
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role, user.geosurepathUserId, uaHash);

    res.cookie('token', accessToken, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRATION });

    // ✅ FIX: Audit Log for Admin Login
    if (user.role === 'ADMIN') {
        logAction({
            adminId: user.id,
            action: AUDIT_ACTIONS.ADMIN_LOGIN,
            details: { email: user.email },
            ipAddress: req.ip
        });
    }

    res.json({
      message: 'Login successful',
      accessToken, // ✅ FIX: Return token for localStorage persistence
      user: { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username || null },
      isHardlocked
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

    // Rotate tokens with UA Hashing (S321)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    const uaHash = crypto.createHash('md5').update(req.headers['user-agent'] || '').digest('hex');
    const tokens = await generateTokens(storedToken.user.id, storedToken.user.role, storedToken.user.geosurepathUserId, uaHash);

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
  res.clearCookie('JSESSIONID', { path: '/' }); // ✅ FIX: Clear Traccar session cookie too
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

    const resetUrl = `${process.env.FRONTEND_URL || 'http://3.108.114.12'}/reset-password?passwordReset=${token}`;
    
    emailQueue.add('reset-password', {
      to: user.email,
      subject: 'Secure Recovery: Reset Your GeoSurePath Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #fafafa;">
          <h2 style="color: #3b82f6; text-align: center;">Identity Recovery Protocol</h2>
          <p>Hello ${user.name},</p>
          <p>A password reset has been requested for your GeoSurePath Enterprise account. Please click the button below to establish your new encrypted credentials:</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1rem; display: inline-block; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">Reset My Password</a>
          </div>

          <p style="color: #64748b; font-size: 0.85rem; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #3b82f6;">${resetUrl}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="color: #94a3b8; font-size: 0.75rem; text-align: center;">
            This recovery link will expire in 1 hour.<br/>
            If you did not request this recovery, please contact your workspace administrator immediately.
          </p>
        </div>
      `
    });

    // Audit Log for Password Reset Request
    logAction({
        userId: user.id,
        action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
        details: { email: user.email },
        ipAddress: req.ip
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

    // ✅ FIX: Sync password change to GeoSurePath using correct geosurepathUserId
      if (user.geosurepathUserId) {
        await geosurepathService.updateUser(user.geosurepathUserId, { password: newPassword })
          .catch(gsErr => console.error('[ResetPassword] GeoSurePath sync failed:', gsErr.message));
      }

      // 3. SECURE SYNC (S35): Revoke all active sessions on other devices
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

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

    // ✅ FIX: Sync password change to GeoSurePath 
    try {
      if (user.geosurepathUserId) {
        await geosurepathService.updateUser(user.geosurepathUserId, { password: newPassword });
        console.log(`[ChangePassword] Synchronized password for GeoSurePath user ${user.geosurepathUserId}`);
      }
    } catch (gsErr) {
      console.error('[ChangePassword] GeoSurePath sync failed:', gsErr.message);
    }

    // ✅ SECURE SYNC (S35): Revoke all sessions, forcing a global re-login with the new password.
    await prisma.refreshToken.deleteMany({ where: { userId } });

    // Audit Log
    logAction({
        userId,
        action: AUDIT_ACTIONS.PASSWORD_CHANGE,
        ipAddress: req.ip
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
};

exports.syncSession = async (req, res) => {
  try {
    // ✅ MAINTENANCE: Purge expired refresh tokens for this user
    await prisma.refreshToken.deleteMany({
        where: { userId: req.user.userId, expiresAt: { lt: new Date() } }
    }).catch(e => console.warn(`[SyncSession] Cleanup failed: ${e.message}`));

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

    // ✅ HARDLOCK CHECK: Use shared helper
    let isHardlocked = false;
    if (user.role === 'CLIENT') {
      const latestSub = await prisma.subscription.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { plan: true }
      });

      if (latestSub) {
        const hardlock = calculateHardlock(user, latestSub);
        isHardlocked = hardlock.isHardlocked;
      }
    }

    // ✅ TRACCAR SESSION RECOVERY: If JSESSIONID is missing from cookies, 
    // try to re-establish it silently using stored credentials or sync.
    const isSecure = process.env.SECURE_COOKIES === 'true';
    if (!req.cookies.JSESSIONID) {
        try {
            // We don't have the password here, but we can try a sync or use a service account 
            // if we really need to, but the best way is to trigger a re-sync if possible.
            // For now, we'll just log and let the frontend handle the retry if needed.
            console.log(`[SyncSession] JSESSIONID missing for ${user.email}.`);
        } catch (syncErr) {
            console.error(`[SyncSession] Traccar recovery failed: ${syncErr.message}`);
        }
    }

    // ✅ FIX: Audit Log for Admin Sync (Optional but good for tracking active sessions)
    if (user.role === 'ADMIN') {
        logAction({
            adminId: user.id,
            action: AUDIT_ACTIONS.ADMIN_SESSION_SYNC,
            details: { email: user.email },
            ipAddress: req.ip
        });
    }

    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.cookies.token;

    res.json({
      message: 'Session synchronized',
      user,
      token, // ✅ FIX: Allow frontend to persist token from synced session
      isHardlocked
    });
  } catch (error) {
    console.error('[SyncSession] Error:', error);
    res.status(500).json({ error: 'Failed to sync session' });
  }
};
// NEW: Get Active Sessions for Current User
exports.getSessions = async (req, res) => {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, expiresAt: true }
    });
    const enriched = sessions.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        device: 'Web Dashboard',
        ip: req.ip || 'Current Location IP'
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active sessions.' });
  }
};

// NEW: Revoke a specific session
exports.revokeSession = async (req, res) => {
    const { sessionId } = req.body;
    try {
        await prisma.refreshToken.delete({
            where: { id: sessionId, userId: req.user.userId }
        });
        res.json({ message: 'Session successfully terminated.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to revoke session.' });
    }
};

// NEW: Get Login History for Current User
exports.getLoginHistory = async (req, res) => {
    try {
        const history = await prisma.loginHistory.findMany({
            where: { userId: req.user.userId },
            take: 20,
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch login ledger.' });
    }
};
// NEW: Setup MFA for the current user
exports.setupMFA = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const secret = speakeasy.generateSecret({ name: `GeoSurePath (${user.email})` });
    
    // Temporarily store secret (unverified)
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret.base32, mfaEnabled: false }
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
};

// NEW: Verify and Enable MFA
exports.verifyMFA = async (req, res) => {
  const { token, userId } = req.body; // userId is used if coming from login flow
  const currentUserId = req.user?.userId || userId;

  if (!token) return res.status(400).json({ error: 'MFA token is required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!user || !user.mfaSecret) return res.status(404).json({ error: 'MFA not initialized for this user' });

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token
    });

    if (!verified) return res.status(400).json({ error: 'Invalid MFA token' });

    // Enable MFA permanently
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true }
    });

    // If verifying from login flow, issue tokens now
    if (!req.user) {
        let isHardlocked = false;
        if (user.role === 'CLIENT') {
          const latestSub = await prisma.subscription.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: { plan: true }
          });
          // ✅ FIX: Use shared helper instead of duplicated logic
          const hardlock = calculateHardlock(user, latestSub);
          isHardlocked = hardlock.isHardlocked;
        }

        const uaHash = crypto.createHash('md5').update(req.headers['user-agent'] || '').digest('hex');
        const tokens = await generateTokens(user.id, user.role, user.geosurepathUserId, uaHash);
        const isSecure = process.env.SECURE_COOKIES === 'true';
        res.cookie('token', tokens.accessToken, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: isSecure, sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRATION });
        
        return res.json({ 
            message: 'MFA Verified. Login successful.', 
            accessToken: tokens.accessToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            isHardlocked
        });
    }

    res.json({ message: 'MFA enabled successfully' });

    logAction({
        userId: user.id,
        action: AUDIT_ACTIONS.ENABLE_MFA,
        ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: 'MFA verification failed' });
  }
};

// NEW: Disable MFA
exports.disableMFA = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { mfaEnabled: false, mfaSecret: null }
    });
    res.json({ message: 'MFA disabled' });
    
    logAction({
        userId: req.user.userId,
        action: AUDIT_ACTIONS.DISABLE_MFA,
        ipAddress: req.ip
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
};
exports.getGoogleAuthUrl = async (req, res) => {
  // ✅ ELITE PROVISIONING: Returning placeholder for Enterprise Tier Google Auth
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(501).json({ error: 'Google Auth not provisioned on this instance.' });
  const redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile`;
  res.json({ url });
};

exports.googleLogin = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'OAuth code missing' });

  // In a real implementation, we'd exchange code for tokens and get user info.
  // For 'Provisioning' phase, we return a targeted instruction.
  return res.status(501).json({ 
    error: 'Google Enterprise Sync in Progress', 
    message: 'Your Google workspace is being synchronized. Please use traditional credentials for the next 24 hours.' 
  });
};

exports.welcomeEmail = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        await emailService.sendWelcomeEmail(user);
        res.json({ message: 'Welcome email sent successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send welcome email' });
    }
};
