const express = require('express');
const router = express.Router();
const { authenticateToken, otpLimiter } = require('../middleware/auth'); 
const { 
    updateHealthStats, 
    logFoodItem, 
    getDailyHealthLog,
    searchFoodNutrition,
    addSymptom,         
    getSymptomHistory   
} = require('../controllers/trackerController');

// ==========================================
// 1. HEALTH & NUTRITION TRACKER ROUTES
// ==========================================
router.post('/stats', authenticateToken, updateHealthStats);
router.post('/food', authenticateToken, logFoodItem);
router.get('/daily', authenticateToken, getDailyHealthLog);
router.get('/search-food', authenticateToken, searchFoodNutrition);

// ====================/======================
// 2. SYMPTOMS TRACKER ROUTES (NEW)
// ==========================================
// Route to add a new symptom
router.post('/symptoms', authenticateToken, addSymptom);

// Route to fetch symptom history for the last 30 days
router.get('/symptoms/history', authenticateToken, getSymptomHistory);

module.exports = router;