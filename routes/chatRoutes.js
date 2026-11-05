const express = require('express');
const router = express.Router();

// Tera authentication middleware (jo JWT verify karta hai)
const { authenticateToken } = require('../middleware/auth'); 

// Apne controller se functions import kar le
const { 
    initializeChatSession, 
    getConsultationChatHistory, 
    getSupportChatHistory,
    getDoctorActiveChats
} = require('../controllers/chatController');

// ==========================================
// CHAT API ROUTES
// ==========================================

// 1. Initialize Doctor-Patient Chat Session 
router.post('/init', authenticateToken, initializeChatSession);

// 2. Get Doctor-Patient Consultation History
router.get('/history/:sessionId', authenticateToken , getConsultationChatHistory);

// 3. Get IT Support/Helpdesk History
router.get('/support/history/:ticketId', authenticateToken, getSupportChatHistory);
// 4. Get Active Chats for a Doctor
router.get('/doctor/active', authenticateToken, getDoctorActiveChats);


module.exports = router;