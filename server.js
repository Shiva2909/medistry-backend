const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./db'); 
const apiRoutes = require('./routes/apiRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const specializationRoutes = require('./routes/specializationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const adminRoutes = require('./routes/adminRoutes.js');
const videoRoutes = require('./routes/videoRoutes.js')

const app = express();
app.use(cors());
app.use(express.json());

// Main API Routes
app.use('/api', apiRoutes);   
app.use('/api/doctors', doctorRoutes);
app.use('/api/schedule',scheduleRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/appointments',appointmentRoutes);
app.use('/api/admin',adminRoutes);
app.use('/api',videoRoutes)



app.get("/", (req, res) => {
    console.log("api is working");
    res.send("Medistry API is working perfectly! 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Server is running on port = ${PORT} !`);
    await connectDB();
});