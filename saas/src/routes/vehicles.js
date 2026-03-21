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

module.exports = router;
