const express = require('express');
const router = express.Router();
const specializationController = require('../controllers/specializationController');

router.post('/', specializationController.addSpecialization);
router.get('/', specializationController.getSpecializations);

module.exports = router;