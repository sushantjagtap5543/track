// src/routes/reports.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/trips', reportController.getTrips);
router.get('/summary', reportController.getSummary);

module.exports = router;
