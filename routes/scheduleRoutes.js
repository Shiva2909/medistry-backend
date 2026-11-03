const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken, otpLimiter } = require('../middleware/auth');
const { checkActiveSubscription } = require('../middleware/checkSubscription');
const { enforceVerifiedReport } = require('../middleware/verifyReportFlow'); 







// === ADMIN & DOCTOR ROUTES for creating schedule, leaves, and slots ===
// Added authenticateToken to prevent unauthorized fake slot generation
router.post('/master', authenticateToken, scheduleController.addMasterSchedule);
router.post('/leave', authenticateToken, scheduleController.addLeave);
router.post('/generate', authenticateToken, scheduleController.generateDailySlots);

// === PATIENT ROUTES for checking available slots and booking ===
// Added authenticateToken back so req.user.userId works in the Smart Slot Engine
router.get('/slots/:date', authenticateToken, scheduleController.getAvailableSlots);

// Booking securely protected by both Auth and Active Subscription (Nano pack or Long-term)
router.put('/book', authenticateToken, checkActiveSubscription, scheduleController.bookSlot);


router.put('/cancel', authenticateToken, scheduleController.cancelAppointment);

module.exports = router;