    // module.exports = router;
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

// 👇 Middleware imported from auth file to verify tokens and admin roles
const { authenticateToken, authorizeRoles } = require('../middleware/auth');


// === PUBLIC ROUTES (Accessible to Patients & Everyone) ===

// Doctor information list 
router.get('/', doctorController.getDoctorList);

// For patient dashboard specifically
router.get('/dashboard-list', doctorController.getDoctorsForPatientDashboard);


// === PROTECTED ROUTES (Requires Login) ===

// Protected: Logged-in Doctor gets their own full profile (Token based, no ID needed)
router.get('/my-profile', authenticateToken, doctorController.getMyDoctorProfile);

// Doctor dashboard stats
router.get('/dashboard-stats', authenticateToken, doctorController.getDoctorDashboardStats);


// === ADMIN PROTECTED ROUTES (Master APIs - Admin Only) ===

// Master API: Create the entire doctor profile with all details in one go
router.post('/profile', authenticateToken, authorizeRoles('ADMIN'), doctorController.createDoctorFullProfile);

// Master API: Update any part of the doctor profile
router.put('/:id', authenticateToken, authorizeRoles('ADMIN'), doctorController.updateDoctorFullProfile);

// Soft Delete: Deactivate doctor profile without removing data from the database
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), doctorController.deleteDoctor);


// === PUBLIC ROUTE (Dynamic param route must be at the very bottom) ===

// Doctor full profile by ID
router.get('/:id', doctorController.getDoctorFullProfile);
    
module.exports = router;