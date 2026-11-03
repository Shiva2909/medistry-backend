const express = require('express');
const router = express.Router();

// Import authentication middleware (Adjust the path according to your project structure)
const { authenticateToken } = require('../middleware/auth'); 

// Import Lab Controller
const labController = require('../controllers/labController');

// =================================================================
// 1. PATIENT ROUTES (Requires JWT Token Authorization)
// =================================================================

// Endpoint triggered when a user confirms a lab test booking from the frontend application
// POST /api/labs/book
router.post('/book', authenticateToken, labController.createLabBooking);

// =================================================================
// 2. PARTNER LAB WEBHOOK ROUTES (No JWT - Secured via HMAC Signature)
// =================================================================

// Endpoint for partner diagnostic labs (e.g., Redcliffe, Orange Health) 
// to push asynchronous status updates or generated reports to our system.
// POST /api/labs/webhook/REDCLIFFE         
// POST /api/labs/webhook/ORANGE
router.post('/webhook/:providerKey', labController.handleLabWebhook);

module.exports = router;