const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Abhi testing ke liye maine isme Auth middleware nahi lagaya hai, 
// taaki tu Postman se direct test kar sake bina kisi token error ke.
// Ek baar chal jaye, toh isme 'authenticateToken' add kar dena.

// Endpoint: GET /api/admin/appointments
router.get('/appointments', adminController.getAllAppointmentsForAdmin);

module.exports = router;  