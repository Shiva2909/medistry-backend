//
const express = require('express');
const router = express.Router();
const authController= require('../controllers/authcontroller');
const onboardingController = require('../controllers/onboardingcontroller');
const {authenticateToken,otpLimiter} =  require('../middleware/auth');



// Auth Routes[cite: 2]   
router.post('/auth/send-otp', otpLimiter, authController.sendOtp);
router.post('/auth/verify-otp', authController.verifyOtp);
router.get('/auth/me', authenticateToken, authController.getMe); 

// Onboarding Routes[cite: 2]
router.patch('/onboarding/step', authenticateToken, onboardingController.saveStep);
router.post('/onboarding/complete', authenticateToken, onboardingController.completeOnboarding);
router.get('/onboarding/complete/list', authenticateToken, onboardingController.getCompletedOnboardingUsers);

// Account Deletion Routes
router.post('/auth/delete-request', authenticateToken, authController.requestAccountDeletion);


// Logout 
router.post('/logout', authenticateToken, authController.logout);



module.exports = router;