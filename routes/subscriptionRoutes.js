const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

// Import authentication middleware for protected routes
const { authenticateToken } = require('../middleware/auth');                                   


/**
 * @route   GET /api/subscriptions/plans
 * @desc    Retrieves all active care plans (e.g., 1-month, 4-month, 6-month, 12-month).
 *          This endpoint is intentionally kept public to allow the mobile app 
 *          to display pricing and plan details to non-authenticated users.
 * @access  Public
 */
router.get('/plans', subscriptionController.getAvailablePlans);

/**
 * @route   POST /api/subscriptions/activate
 * @desc    Assigns a specific subscription plan to a user and dynamically calculates 
 *          the exact expiration date based on the plan's duration. In a production 
 *          environment, this endpoint is typically triggered by a Payment Gateway 
 *          Webhook (e.g., Razorpay/Cashfree) upon successful transaction.
 * @access  Protected (Requires valid JWT Token / Admin Role)
 */
router.post('/activate', authenticateToken, subscriptionController.activateUserSubscription);

module.exports = router;