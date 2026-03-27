// src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { authenticateToken } = require('../middleware/authMiddleware');

// Registration (Step 1, 2, 3 combined into one payload)
router.post('/register', authController.register);

// Secure Login
router.post('/login', authController.login);

// Hyper-Sync Traccar Session
router.get('/sync', authController.syncSession);

// Change Password (Synchronization with Traccar)
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router;