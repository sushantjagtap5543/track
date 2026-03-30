// src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.post('/change-password', authenticateToken, authController.changePassword);
router.get('/sync', authenticateToken, authController.syncSession);
router.get('/sessions', authenticateToken, authController.getSessions);
router.post('/revoke-session', authenticateToken, authController.revokeSession);
router.get('/login-history', authenticateToken, authController.getLoginHistory);

module.exports = router;