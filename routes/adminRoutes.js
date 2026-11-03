const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

/**
 * ============================================================================
 * ADMIN MODULE ROUTES
 * ============================================================================
 * NOTE: Authentication and Role-based middleware (e.g., authenticateToken, 
 * verifyAdminRole) are temporarily bypassed to facilitate seamless API 
 * testing via Postman. Ensure these are re-enabled before production deployment.
 */

/**
 * @route   GET /api/admin/appointments
 * @desc    Retrieves a comprehensive list of all platform appointments, 
 *          including merged data for both patients and doctors. 
 *          Used for the main administrative monitoring dashboard.
 * @access  Admin (Currently Public for Testing)
 */
router.get('/appointments', adminController.getAllAppointmentsForAdmin);

/**
 * @route   GET /api/admin/doctor-history/:id
 * @desc    Fetches enterprise-level analytics for a specific doctor.
 *          Includes total patient volume, consultation completion rates, 
 *          and clinical trends (top diseases/reasons treated).
 * @param   {number} id The unique DoctorId from the database
 * @access  Admin (Currently Public for Testing)
 */
router.get('/doctor-history/:id', adminController.getDoctorAnalytics);

/**
 * @route   GET /api/admin/patient-history/:id
 * @desc    Generates a complete Electronic Health Record (EHR) timeline 
 *          for a specific patient. Displays demographic data and their 
 *          entire chronological journey across different doctors on the platform.
 * @param   {number} id The unique UserId of the patient from the database
 * @access  Admin (Currently Public for Testing)
 */
router.get('/patient-history/:id', adminController.getPatientMedicalJourney);

/**
 * @route   PUT /api/admin/reports/:reportId/verify
 * @desc    Allows an admin to verify (Approve/Reject) a patient's uploaded 
 *          blood report. Approval is required to unlock the doctor consultation 
 *          booking flow for the patient.
 * @param   {number} reportId The unique ReportId from the PatientReports table
 * @access  Admin (Currently Public for Testing)
 */
router.put('/reports/:reportId/verify', adminController.verifyPatientReport);





// for assigning a new doctor id assign doctor of a patient is not avalaible for cunsultation
router.put('/patients/:patientId/reassign', adminController.reassignPatientDoctor);

module.exports = router;