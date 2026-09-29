const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const authenticateToken = require('../middleware/auth');


// === ADMIN & DOCTOR ROUTES for creating schedule and leaves and  slots 
router.post('/master', scheduleController.addMasterSchedule);
router.post('/leave', scheduleController.addLeave);
router.post('/generate', scheduleController.generateDailySlots);

// === PATIENT ROUTES for checking available slots and book there schedule
router.get('/slots/:doctorId/:date', scheduleController.getAvailableSlots);
router.put('/book',authenticateToken, scheduleController.bookSlot);
router.put('/cancel',authenticateToken, scheduleController.cancelAppointment);



module.exports = router;