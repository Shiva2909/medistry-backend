const express = require('express');
const router = express.Router();

// Import authentication middleware to protect routes
const { authenticateToken } = require('../middleware/auth'); 

// Import payment controller functions
const {
    createOrder,
    verifyPayment,
    getPaymentStatus,
    webhookHandler,
    initiateRefund
} = require('../controllers/paymentController');

// ==========================================
// PATIENT APP PAYMENT ROUTES
// ==========================================

// Route: POST /api/payments/create-order
// Description: Calculates exact amount from DB and creates a Razorpay order
// Access: Protected (Requires Patient JWT Token)
router.post('/create-order', authenticateToken, createOrder);

// Route: POST /api/payments/verify
// Description: Verifies the HMAC-SHA256 signature from Razorpay and activates the service
// Access: Protected (Requires Patient JWT Token)
router.post('/verify', authenticateToken, verifyPayment);

// Route: GET /api/payments/:paymentId/status
// Description: Fetches the latest payment status from the database
// Access: Protected (Requires Patient JWT Token)
router.get('/:paymentId/status', authenticateToken, getPaymentStatus);


// ==========================================
// BACKGROUND & ADMIN ROUTES
// ==========================================

// Route: POST /api/payments/razorpay/webhook
// Description: Handles asynchronous payment updates (Captured, Failed, Refunded) directly from Razorpay
// Access: Public (Security handled via Razorpay Webhook Signature validation)
// IMPORTANT: This route must use express.raw() in server.js before express.json() is applied
router.post('/razorpay/webhook', webhookHandler);

// Route: POST /api/payments/admin/:paymentId/refund
// Description: Initiates a full or partial refund for a captured payment
// Access: Protected (Strictly ADMIN Only)
// Note: If you have a specific admin middleware (e.g., verifyAdmin), replace authenticateToken with it.
router.post('/admin/:paymentId/refund', authenticateToken, initiateRefund);

module.exports = router;