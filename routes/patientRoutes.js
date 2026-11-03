const express = require('express');
const router = express.Router();

// Middlewares
const { authenticateToken } = require('../middleware/auth');

// Controllers
const patientController = require('../controllers/patientController'); 

// ==========================================
// PATIENT ROUTES (Base URL: /api/patient)
// ==========================================

// 1. Dashboard API (God API for Home Screen)
router.get('/dashboard', authenticateToken, patientController.getPatientDashboardProfile);




module.exports = router;