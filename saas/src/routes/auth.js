// src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
// New MFA Routes
router.post('/mfa/setup', authenticateToken, authController.setupMFA);
router.post('/mfa/verify', authController.verifyMFA); // Public if called from login
router.post('/mfa/enable', authenticateToken, authController.verifyMFA); // Authenticated for setup
router.post('/mfa/disable', authenticateToken, authController.disableMFA);
router.post('/welcome-email', authController.welcomeEmail);

router.post('/change-password', authenticateToken, authController.changePassword);
router.get('/sync', authenticateToken, authController.syncSession);
router.get('/sessions', authenticateToken, authController.getSessions);
router.post('/revoke-session', authenticateToken, authController.revokeSession);
router.get('/login-history', authenticateToken, authController.getLoginHistory);

module.exports = router;