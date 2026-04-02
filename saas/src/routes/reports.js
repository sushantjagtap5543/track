// src/routes/reports.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/trips', reportController.getTrips);
router.get('/summary', reportController.getSummary);
router.get('/combined', reportController.getCombined);
router.get('/events', reportController.getEvents);
router.get('/stops', reportController.getStops);
router.get('/route', reportController.getRoute);

module.exports = router;