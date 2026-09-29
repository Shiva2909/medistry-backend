const { connectDB, sql } = require('../db');

/**
 * @function getAllAppointmentsForAdmin
 * @description Admin Dashboard: Shows all bookings with both Patient and Doctor details
 * @route GET /api/admin/appointments
 */
const getAllAppointmentsForAdmin = async (req, res) => {
    try {
        const pool = await connectDB();

        // SQL JOIN query to combine Appointments, Slots, Doctors, and Users (Patients)
        const result = await pool.request().query(`
            SELECT 
                a.AppointmentId, 
                a.Status, 
                a.ConsultationType, 
                a.BookedAt,
                CONVERT(varchar, s.SlotDate, 23) AS SlotDate, 
                CONVERT(varchar(5), s.StartTime, 108) AS StartTime, 
                CONVERT(varchar(5), s.EndTime, 108) AS EndTime,
                d.FullName AS DoctorName, 
                d.Phone AS DoctorPhone,
                u.FirstName AS PatientFirstName,
                u.LastName AS PatientLastName,
                u.mobile AS PatientMobile,
                u.Gender AS PatientGender
            FROM Appointments a
            JOIN DoctorSlots s ON a.SlotId = s.SlotId
            JOIN Doctors d ON a.DoctorId = d.DoctorId
            JOIN users u ON a.UserId = u.UserId
            ORDER BY a.BookedAt DESC
        `);

        return res.json({ 
            success: true, 
            data: result.recordset, 
            message: "All appointments fetched for Admin", 
            error: null 
        });
    } catch (error) {
        console.error("Error in getAllAppointmentsForAdmin:", error);
        return res.status(500).json({ success: false, data: [], message: "Server Error", error: error.message });
    }
};

module.exports = { getAllAppointmentsForAdmin };