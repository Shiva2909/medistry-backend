//
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authcontroller');
const onboardingController = require('../controllers/onboardingcontroller');
const authenticateToken = require('../middleware/auth');

// Auth Routes[cite: 2]
router.post('/auth/send-otp', authController.sendOtp);
router.post('/auth/verify-otp', authController.verifyOtp);
router.get('/auth/me', authenticateToken, authController.getMe); 

// Onboarding Routes[cite: 2]
router.patch('/onboarding/step', authenticateToken, onboardingController.saveStep);
router.post('/onboarding/complete', authenticateToken, onboardingController.completeOnboarding);

module.exports = router;