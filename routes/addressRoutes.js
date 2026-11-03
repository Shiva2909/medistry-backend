const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const addressController = require('../controllers/addressController');

// Patient Address Management Routes
router.post('/add', authenticateToken, addressController.addPatientAddress);
router.get('/my-addresses', authenticateToken, addressController.getMyAddresses);
router.delete('/:addressId', authenticateToken, addressController.deletePatientAddress);

module.exports = router;