const { connectDB, sql } = require('../db');
const { disableVideoRoom } = require('../utils/hmsService');

/**
 * @function joinVideoConsultation
 * @description Validates appointment time and returns join links if within the allowed window.
 * @route GET /api/video/appointments/:id/join
 */
const joinVideoConsultation = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        
        // Takes Role and ID from token
        const safeUserId = Number(req.user.userId || req.user.id || req.user.doctorId); 
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';

        const pool = await connectDB();
        
        // : Fetch Appointment Date/Time and Status for validation
      
        const result = await pool.request()
            .input('AppointmentId', sql.Int, appointmentId)
            .query(`
                SELECT 
                    A.DoctorId, 
                    A.UserId AS PatientUserId, 
                    D.UserId AS DoctorUserId,
                    A.VideoRoomId, 
                    A.PatientRoomCode, 
                    A.DoctorRoomCode, 
                    A.PatientJoinLink, 
                    A.DoctorJoinLink, 
                    A.Status,
                    -- SQL me hi Date aur Time ko string me convert kar rahe hain taaki Node.js easily padh sake
                    CONVERT(VARCHAR(10), S.SlotDate, 120) AS FormattedDate, 
                    CONVERT(VARCHAR(8), S.StartTime, 108) AS FormattedTime
                FROM Appointments A
                LEFT JOIN Doctors D ON A.DoctorId = D.DoctorId
                -- Ye maan kar chal raha hu ki Appointments table me SlotId hai jo DoctorSlots se judta hai
                LEFT JOIN DoctorSlots S ON A.SlotId = S.SlotId 
                WHERE A.AppointmentId = @AppointmentId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Appointment not found." });
        }

        const appointment = result.recordset[0];

        // ---------------------------------------------------------
        // RULE 3: PERMANENT LOCK (Check if consultation is already over)
        // ---------------------------------------------------------
        if (appointment.Status === 'Completed') {
            return res.status(403).json({ 
                success: false, 
                message: "This Meeting has already ended. You cannot join." 
            });
        }
        if (appointment.Status === 'Cancelled') {
             return res.status(403).json({ 
                success: false, 
                message: "This appointment was cancelled." 
            });
        }

        // ---------------------------------------------------------
        // RULE 1: EARLY ENTRY VALIDATION (The 10-minute Gatekeeper)
        // ---------------------------------------------------------
        // Safety check agar Slot time database me null ho
        if (!appointment.FormattedDate || !appointment.FormattedTime) {
             return res.status(500).json({ success: false, message: "Slot timing information is missing for this appointment." });
        }

        // Combine Date and Time from DB to create a proper native Date object
        const appointmentDateTimeString = `${appointment.FormattedDate}T${appointment.FormattedTime}`; 
        const scheduledTime = new Date(appointmentDateTimeString);
        
        // Allowed Entry = 10 minutes BEFORE scheduled time (10 mins * 60 secs * 1000 ms)
        const allowedEntryTime = new Date(scheduledTime.getTime() - (10 * 60 * 1000));
        
        // Current Server Time
        const currentTime = new Date();

        // Check if user is trying to join too early
        if (currentTime < allowedEntryTime) {
            // Time ko readable Indian format mein (jaise 02:50 PM) convert karna
            const timeString = allowedEntryTime.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            });
            
            return res.status(403).json({ 
                success: false, 
                message: `You are too early. You can join 10 minutes before your slot at ${timeString}.` 
            });
        }
        // ---------------------------------------------------------
        // AUTHORIZATION (Role Check)
        // ---------------------------------------------------------
        let roomCode = null;
        let joinLink = null;
        let assignedRole = null;

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

        // RULE 2 (Relaxed Exit) is automatically handled by 100ms when using the standard joinLink/roomCode.
        // Once they are in, 100ms won't kick them until the Doctor presses "End for All".

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

/**
 * @function endVideoConsultation
 * @description Marks the appointment as "Completed" so no one can join the room again.
 * @route POST /api/video/appointments/:id/end
 */
const endVideoConsultation = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';

        // Only doctors should be able to officially end the consultation
        if (userRole !== 'doctor') {
             return res.status(403).json({ success: false, message: "Only doctors can end the consultation." });
        }

        const pool = await connectDB();
        
        // Fetch room id and SlotId
        const checkResult = await pool.request()
            .input('AppointmentId', sql.Int, appointmentId)
            .query(`SELECT VideoRoomId, SlotId, Status FROM Appointments WHERE AppointmentId = @AppointmentId`);

        if (checkResult.recordset.length === 0 || checkResult.recordset[0].Status === 'Completed') {
             return res.status(400).json({ success: false, message: "Appointment already completed or not found." });
        }

        const roomId = checkResult.recordset[0].VideoRoomId;
        const slotId = checkResult.recordset[0].SlotId;

        // 1. Update BOTH Appointments and DoctorSlots status to 'Completed'
        await pool.request()
            .input('AppointmentId', sql.Int, appointmentId)
            .input('SlotId', sql.Int, slotId)
            .query(`
                BEGIN TRAN;
                UPDATE Appointments SET Status = 'Completed' WHERE AppointmentId = @AppointmentId;
                UPDATE DoctorSlots SET Status = 'Completed' WHERE SlotId = @SlotId;
                COMMIT TRAN;
            `);

        // 2. Kill the room directly on 100ms servers (Wrapped in try-catch so DB commit doesn't fail if 100ms glitches)
        if (roomId) {
            try {
                await disableVideoRoom(roomId);
            } catch (hmsError) {
                console.error("[100ms Error] Room could not be disabled, but DB is updated:", hmsError.message);
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: "Consultation ended. Room permanently locked on backend and 100ms servers." 
        });

    } catch (error) {
         console.error("[End API Error]:", error);
         return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};
module.exports = {
    joinVideoConsultation,
    endVideoConsultation 
};