const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const {authenticateToken,otpLimiter} = require('../middleware/auth');

// === PATIENT ROUTES ===
// This api is used to show there all booking past and present 
// Endpoint: GET /api/appointments/patient
router.get('/patient',authenticateToken, appointmentController.getPatientAppointments);

// === DOCTOR ROUTES ===
// this api to show doctor present day queue with patient details 
// Endpoint: GET /api/appointments/doctor?date=YYYY-MM-DD
router.get('/doctor', authenticateToken, appointmentController.getDoctorQueue);

// doctor routes =
// this api help doctor to see there all patients lists

router.get('/doctor/patients', authenticateToken, appointmentController.getDoctorPatients);

module.exports = router;  