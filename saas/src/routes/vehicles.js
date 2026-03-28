// src/routes/vehicles.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Vehicle Fleet Management
router.get('/', vehicleController.getVehicles);
router.post('/', vehicleController.createVehicle);
router.put('/:vehicleId', vehicleController.updateVehicle);
router.delete('/:vehicleId', vehicleController.deleteVehicle);
router.post('/bulk', vehicleController.bulkUploadVehicles);

// Engine controls
router.post('/engine', vehicleController.toggleEngine);

// Safe parking toggle
router.post('/safe-parking', vehicleController.toggleSafeParking);

// Custom Alerts
router.post('/alerts', vehicleController.createAlertRule);
router.get('/:vehicleId/alerts', vehicleController.getAlertRules);
router.delete('/alerts/:ruleId', vehicleController.deleteAlertRule);

module.exports = router;