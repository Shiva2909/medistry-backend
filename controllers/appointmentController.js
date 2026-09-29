const { connectDB, sql } = require('../db');

/**
 * @function getPatientAppointments
 * @description Patient App: Shows patient's upcoming and past appointments with Doctor details
 * @route GET /api/appointments/patient
 */
const getPatientAppointments = async (req, res) => {
    try {
        const userId = req.user.userId; // Securely fetched from token
        const pool = await connectDB();

        // Industry Standard: Using JOINs to combine Appointments, Slots, Doctors, and Specializations
        // We only SELECT the specific columns needed by the mobile app UI to save bandwidth.
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT 
                    a.AppointmentId, a.Status, a.ConsultationType, a.Reason, a.BookedAt,
                    CONVERT(varchar, s.SlotDate, 23) AS SlotDate, 
                    CONVERT(varchar(5), s.StartTime, 108) AS StartTime, 
                    CONVERT(varchar(5), s.EndTime, 108) AS EndTime,
                    d.FullName AS DoctorName, 
                    d.ProfileImageUrl AS DoctorPhoto, 
                    d.ExperienceYears,
                    sp.Name AS Specialization
                FROM Appointments a
                JOIN DoctorSlots s ON a.SlotId = s.SlotId
                JOIN Doctors d ON a.DoctorId = d.DoctorId
                LEFT JOIN Specializations sp ON d.SpecializationId = sp.SpecializationId
                WHERE a.UserId = @UserId
                ORDER BY s.SlotDate DESC, s.StartTime DESC
            `);

        return res.json({ success: true, data: result.recordset, message: "Appointments fetched successfully", error: null });
    } catch (error) {
        console.error("Error in getPatientAppointments:", error);
        return res.status(200).json({ success: false, data: [], message: "Server Error", error: error.message });
    }
};

/**
 * @function getDoctorQueue
 * @description Doctor Portal: Shows doctor's appointments for a specific date with Patient details
 * @route GET /api/appointments/doctor?date=YYYY-MM-DD
 */
const getDoctorQueue = async (req, res) => {
    try {
        const userId = req.user.userId; // Doctor's User ID from token
        let targetDate = req.query.date;      
        
        // If no date provided from frontend, default to today
        if (!targetDate) {
            targetDate = new Date().toISOString().split('T')[0];
        }

        const pool = await connectDB();

        // 1. First, find the DoctorId associated with this logged-in User
        const docCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .query('SELECT DoctorId FROM Doctors WHERE UserId = @UserId');
            
        if (docCheck.recordset.length === 0) {
            return res.status(200).json({ success: false, message: "Access denied. Not registered as a Doctor." });
        }
        
        const doctorId = docCheck.recordset[0].DoctorId;

        // 2. Fetch the queue with Patient details
        // Industry Standard: Extracting specific keys from the JSON blob directly in SQL using JSON_VALUE
        const result = await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .input('TargetDate', sql.Date, targetDate)
            .query(`
                SELECT 
                    a.AppointmentId, a.Status, a.ConsultationType, a.Reason,
                    CONVERT(varchar(5), s.StartTime, 108) AS StartTime,
                    CONVERT(varchar(5), s.EndTime, 108) AS EndTime,
                    u.UserId AS PatientId,
                    u.mobile AS PatientPhone,
                    JSON_VALUE(u.profiledata, '$.first_name') AS FirstName,
                    JSON_VALUE(u.profiledata, '$.gender') AS Gender,
                    JSON_VALUE(u.profiledata, '$.age_years') AS Age,
                    JSON_VALUE(u.profiledata, '$.weight_kg') AS WeightKg
                FROM Appointments a
                JOIN DoctorSlots s ON a.SlotId = s.SlotId
                JOIN users u ON a.UserId = u.UserId
                WHERE a.DoctorId = @DoctorId     
                  AND s.SlotDate = @TargetDate
                  AND a.Status <> 'Cancelled'
                ORDER BY s.StartTime ASC
            `);

        return res.json({ success: true, data: result.recordset, message: `Queue for ${targetDate}`, error: null });
    } catch (error) {
        console.error("Error in getDoctorQueue:", error);
        return res.status(200).json({ success: false, data: [], message: "Server Error", error: error.message });
    }
};

module.exports = {
    getPatientAppointments,
    getDoctorQueue
};