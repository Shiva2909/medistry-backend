const { connectDB, sql } = require('../db');

/**
 * @function joinVideoConsultation
 * @description Returns the 100ms Room Code for the logged-in user (Patient/Doctor) to join the call
 * @route GET /api/video/appointments/:id/join
 */
const joinVideoConsultation = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        
        // Token se aayi ID aur role
        const safeUserId = Number(req.user.userId || req.user.id || req.user.doctorId); 
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';

        const pool = await connectDB();
        
        // NAYI QUERY: Doctors table ko JOIN kiya hai taaki DoctorUserId mil sake
        const result = await pool.request()
            .input('AppointmentId', sql.Int, appointmentId)
            .query(`
                SELECT 
                    A.DoctorId, 
                    A.UserId AS PatientUserId, 
                    D.UserId AS DoctorUserId,  -- Doctor ki asli UserId yahan se aayegi
                    A.VideoRoomId, 
                    A.PatientRoomCode, 
                    A.DoctorRoomCode, 
                    A.PatientJoinLink, 
                    A.DoctorJoinLink, 
                    A.Status 
                FROM Appointments A
                LEFT JOIN Doctors D ON A.DoctorId = D.DoctorId
                WHERE A.AppointmentId = @AppointmentId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        const appointment = result.recordset[0];

        let roomCode = null;
        let joinLink = null;
        let assignedRole = null;

        // Ab hum PatientUserId aur DoctorUserId ko token wali ID se match karenge
        if (userRole === 'patient' && appointment.PatientUserId === safeUserId) {
            assignedRole = 'patient';
            roomCode = appointment.PatientRoomCode;
            joinLink = appointment.PatientJoinLink;
        } else if (userRole === 'doctor' && appointment.DoctorUserId === safeUserId) {
            assignedRole = 'doctor';
            roomCode = appointment.DoctorRoomCode;
            joinLink = appointment.DoctorJoinLink;
        } else {
            return res.status(403).json({ success: false, message: "You are not authorized to join this consultation." });
        }

        return res.status(200).json({
            success: true,
            data: {
                roomId: appointment.VideoRoomId,
                role: assignedRole,
                roomCode: roomCode,
                joinLink: joinLink
            }
        });

    } catch (error) {
        console.error("[Join API Error]:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

module.exports = {
  
    joinVideoConsultation
};