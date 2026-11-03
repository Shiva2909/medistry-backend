const express = require('express');
const router = express.Router();

// Import Middlewares
const {authenticateToken,otpLimiter} = require('../middleware/auth'); 
const upload = require('../middleware/uploadmiddleware');

// Import Controllers
const {    
    uploadPatientReport, 
    createPrescription, 
    getPatientMedicalHistory ,
    getPrescriptionDetails
} = require('../controllers/ehrController');

/**
 * EHR Routes
 */
// Patient uploads a report (Expecting 'reportFile' as the form-data key)
router.post('/reports/upload', authenticateToken, upload.single('file'), uploadPatientReport);

// Doctor creates a new prescription
router.post('/prescriptions/create', authenticateToken, createPrescription);

// Fetch complete medical history for a specific patient
router.get('/history/:patientUserId', authenticateToken, getPatientMedicalHistory);

//this api provide prescription detail to doctor and patient
router.get('/prescription/:prescriptionId', authenticateToken,getPrescriptionDetails);

module.exports = router;