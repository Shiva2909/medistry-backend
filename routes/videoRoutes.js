const express = require('express');
const router = express.Router();
const  videoController = require('../controllers/videoController');
const  {authenticateToken} = require('../middleware/auth');

// route for creating room for patients and doctor

router.get('/video/appointments/:id/join', authenticateToken, videoController.joinVideoConsultation); 

//: Lock the room permanently when doctor ends call
router.post('/video/appointments/:id/end', authenticateToken, videoController.endVideoConsultation); 


module.exports = router;



















