const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// 👇 1. Yahan apne middleware import kar (path apne project ke hisaab se adjust kar lena agar alag ho)
const { authenticateToken, authorizeRoles } = require('../middleware/auth'); 

/**
 * ============================================================================
 * ADMIN MODULE ROUTES (SECURED)
 * ============================================================================
 * NOTE: Authentication and Role-based middleware are now ACTIVE.
 * Only users with a valid JWT token containing role: 'ADMIN' can access these.
 */

/**
 * @route   GET /api/admin/appointments
 * @desc    Retrieves a comprehensive list of all platform appointments.
 * @access  Strictly Admin Only
 */
router.get('/appointments', authenticateToken, authorizeRoles('ADMIN'), adminController.getAllAppointmentsForAdmin);

/**
 * @route   GET /api/admin/doctor-history/:id
 * @desc    Fetches enterprise-level analytics for a specific doctor.
 * @param   {number} id The unique DoctorId from the database
 * @access  Strictly Admin Only
 */
router.get('/doctor-history/:id', authenticateToken, authorizeRoles('ADMIN'), adminController.getDoctorAnalytics);

/**
 * @route   GET /api/admin/patient-history/:id
 * @desc    Generates a complete Electronic Health Record (EHR) timeline for a specific patient.
 * @param   {number} id The unique UserId of the patient from the database
 * @access  Strictly Admin Only
 */
router.get('/patient-history/:id', authenticateToken, authorizeRoles('ADMIN'), adminController.getPatientMedicalJourney);

/**
 * @route   PUT /api/admin/reports/:reportId/verify
 * @desc    Allows an admin to verify (Approve/Reject) a patient's uploaded blood report.
 * @param   {number} reportId The unique ReportId from the PatientReports table
 * @access  Strictly Admin Only
 */
router.put('/reports/:reportId/verify', authenticateToken, authorizeRoles('ADMIN'), adminController.verifyPatientReport);

/**
 * @route   PUT /api/admin/patients/:patientId/reassign
 * @desc    Assigns a new default doctor to a patient if their current one is unavailable.
 * @param   {number} patientId The unique UserId of the patient
 * @access  Strictly Admin Only
 */
router.put('/patients/:patientId/reassign', authenticateToken, authorizeRoles('ADMIN'), adminController.reassignPatientDoctor);

module.exports = router;