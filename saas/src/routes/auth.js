// src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Registration (Step 1, 2, 3 combined into one payload)
router.post('/register', authController.register);

// Secure Login
router.post('/login', authController.login);

module.exports = router;
