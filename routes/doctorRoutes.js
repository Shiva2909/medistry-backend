// const express = require('express');
// const router = express.Router();
// const doctorController = require('../controllers/doctorController');

// // Ye middleware tera auth file se aayega jo role check karega
// // const { verifyToken, isAdmin } = require('../middlewares/auth');

// // === PUBLIC ROUTES (Patients ke liye) ===
// router.get('/', doctorController.getDoctorList);
// router.get('/:id', doctorController.getDoctorFullProfile);

// // === ADMIN PROTECTED ROUTES (Sirf Admin chala payega) ===
// // Testing ke baad inke aage middleware laga dena: router.post('/profile', verifyToken, isAdmin, doctorController.createDoctorProfile);
// router.post('/profile', doctorController.createDoctorProfile);
// router.post('/registration', doctorController.addDoctorRegistration);
// router.post('/location', doctorController.addDoctorLocation);
// router.post('/professional-details', doctorController.addProfessionalDetails);
// router.post('/document', doctorController.addDoctorDocument);
// router.put('/:id', doctorController.updateDoctorProfile);
// router.delete('/:id', doctorController.deleteDoctor); // Soft delete

// module.exports = router;




const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

// Middleware imported from your auth file to verify admin roles
// const { verifyToken, isAdmin } = require('../middlewares/auth');

// === PUBLIC ROUTES (Accessible to Patients & Everyone) ===
router.get('/', doctorController.getDoctorList);
router.get('/:id', doctorController.getDoctorFullProfile);

// === ADMIN PROTECTED ROUTES (Master APIs - Admin Only) ===
// Note: Once testing is complete, apply the middleware to these routes like this:
// router.post('/profile', verifyToken, isAdmin, doctorController.createDoctorFullProfile);

// Master API: Create the entire doctor profile with all details in one go
router.post('/profile', doctorController.createDoctorFullProfile);

// Master API: Update any part of the doctor profile
router.put('/:id', doctorController.updateDoctorFullProfile);

// Soft Delete: Deactivate doctor profile without removing data from the database
router.delete('/:id', doctorController.deleteDoctor);

module.exports = router;