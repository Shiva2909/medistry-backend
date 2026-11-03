const { connectDB, sql } = require('../db');

/**
 * @function initializeChatSession
 * @description Initializes a secure chat room. Includes Gatekeeper Validation 
 *              to ensure the patient has a valid, non-cancelled appointment with the doctor.
 * @route POST /api/chat/init
 * @access Protected (Requires Patient/User JWT Token)                      
 */
const initializeChatSession = async (req, res) => {
    try {
        const patientId = req.user.userId; // Extracted securely from JWT token
        const { doctorId } = req.body; 

        if (!doctorId) {
            return res.status(400).json({ success: false, message: "doctorId is required." });
        }
 
        const pool = await connectDB();

        // ==========================================
        // 1. GATEKEEPER VALIDATION (Strict Appointment Check)
        // ==========================================
        // Verify if the user has an actual active appointment (not cancelled) with this doctor.
        // Using 'UserId' and 'BookedAt' as seen in the schema image.
        const checkAppointment = await pool.request()
            .input('UserId', sql.Int, patientId)
            .input('DoctorId', sql.Int, doctorId)
            .query(`
                SELECT TOP 1 AppointmentId 
                FROM Appointments 
                WHERE UserId = @UserId 
                  AND DoctorId = @DoctorId 
                  AND Status != 'Cancelled' -- Chat only allowed if appointment is active/confirmed/completed
                ORDER BY BookedAt DESC
            `);

        if (checkAppointment.recordset.length === 0) {
            // Hacker or unauthorized user blocked!
            return res.status(403).json({ 
                success: false, 
                message: "Access Denied: You can only chat with doctors you have a valid appointment with." 
            });
        }

        const appointmentId = checkAppointment.recordset[0].AppointmentId;

        // ==========================================
        // 2. CHECK FOR EXISTING ACTIVE CHAT ROOM
        // ==========================================
        const checkSession = await pool.request()
            .input('PatientId', sql.Int, patientId)
            .input('DoctorId', sql.Int, doctorId)
            .query(`
                SELECT SessionId FROM ChatSessions 
                WHERE PatientId = @PatientId AND DoctorId = @DoctorId AND Status = 'Active'
            `);

        if (checkSession.recordset.length > 0) {
            // Room already exists, return the existing ID
            return res.status(200).json({ 
                success: true, 
                message: "Existing active chat session found.",
                sessionId: checkSession.recordset[0].SessionId 
            });
        }

        // ==========================================
        // 3. CREATE A NEW SECURE CHAT ROOM
        // ==========================================
        // Linking the Chat Room directly to the exact AppointmentId
        const newSession = await pool.request()
            .input('PatientId', sql.Int, patientId)
            .input('DoctorId', sql.Int, doctorId)
            .input('AppointmentId', sql.Int, appointmentId)
            .query(`
                INSERT INTO ChatSessions (PatientId, DoctorId, AppointmentId, Status, ExpiresAt)
                OUTPUT INSERTED.SessionId
                VALUES (@PatientId, @DoctorId, @AppointmentId, 'Active', DATEADD(day, 7, GETDATE()))
            `);

        return res.status(201).json({
            success: true,
            message: "New consultation chat room created successfully.",
            sessionId: newSession.recordset[0].SessionId
        });

    } catch (error) {
        console.error("[Chat Controller] Init Session Error:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};




/**
 * @function getConsultationChatHistory
 */
const getConsultationChatHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const pool = await connectDB();

        // THE FIX: Changed 'SentAt' to 'CreatedAt'
        const result = await pool.request()
            .input('SessionId', sql.Int, sessionId)
            .query(`
                SELECT MessageId, SenderId, SenderRole, MessageType, MessageText, FileUrl, IsRead, CreatedAt
                FROM ChatMessages
                WHERE SessionId = @SessionId
                ORDER BY CreatedAt ASC
            `);

        return res.status(200).json({ 
            success: true, 
            data: result.recordset, 
            message: "Consultation chat history fetched successfully." 
        });
    } catch (error) {
        console.error("[Chat API] Fetch Consultation History Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @function getSupportChatHistory
 */
const getSupportChatHistory = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const pool = await connectDB();

        // THE FIX: Changed 'SentAt' to 'CreatedAt'
        const result = await pool.request()
            .input('TicketId', sql.Int, ticketId)
            .query(`
                SELECT MessageId, SenderId, SenderRole, MessageText, FileUrl, IsRead, CreatedAt
                FROM SupportMessages
                WHERE TicketId = @TicketId
                ORDER BY CreatedAt ASC
            `);

        return res.status(200).json({ 
            success: true, 
            data: result.recordset, 
            message: "Support chat history fetched successfully." 
        });
    } catch (error) {
        console.error("[Chat API] Fetch Support History Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const getDoctorActiveChats = async (req, res) => {
    try {
        const userId = req.user.userId; // Doctor's User ID from JWT Token
        const pool = await connectDB();

        // 1. Get the actual DoctorId mapped to this UserId
        const docResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`SELECT DoctorId FROM Doctors WHERE UserId = @UserId`);

        if (docResult.recordset.length === 0) {
            return res.status(403).json({ success: false, message: "Access Denied: You are not registered as a Doctor." });
        }

        const doctorId = docResult.recordset[0].DoctorId;

        // 2. Fetch all active chat sessions for this doctor with patient details
        const chatsResult = await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .query(`
                SELECT 
                    cs.SessionId, 
                    cs.AppointmentId, 
                    cs.CreatedAt AS ChatStartedAt,
                    u.UserId AS PatientUserId,
                    u.FirstName, u.LastName, u.mobile AS PatientPhone
                FROM ChatSessions cs
                JOIN users u ON cs.PatientId = u.UserId
                WHERE cs.DoctorId = @DoctorId AND cs.Status = 'Active'
                ORDER BY cs.CreatedAt DESC
            `);

        // Format names for frontend
        const activeChats = chatsResult.recordset.map(chat => ({
            ...chat,
            PatientName: `${chat.FirstName || ''} ${chat.LastName || ''}`.trim()
        }));

        return res.status(200).json({ 
            success: true, 
            data: activeChats, 
            message: "Active chats fetched successfully." 
        });

    } catch (error) {
        console.error("[Chat API] Fetch Doctor Chats Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};




module.exports = { initializeChatSession,
    getConsultationChatHistory, 
    getSupportChatHistory,
    getDoctorActiveChats
 };








 
































































