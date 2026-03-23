// src/routes/vehicles.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Get client's vehicles
router.get('/', vehicleController.getVehicles);

// Engine controls
router.post('/engine', vehicleController.toggleEngine);

// Safe parking toggle
router.post('/safe-parking', vehicleController.toggleSafeParking);

// Custom Alerts
router.post('/alerts', vehicleController.createAlertRule);
router.get('/:vehicleId/alerts', vehicleController.getAlertRules);
router.delete('/alerts/:ruleId', vehicleController.deleteAlertRule);

module.exports = router;
