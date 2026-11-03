// const { connectDB, sql } = require('../db');

// /**
//  * @function getAllAppointmentsForAdmin
//  * @description Admin Dashboard: Shows all bookings with both Patient and Doctor details
//  * @route GET /api/admin/appointments
//  */
// const getAllAppointmentsForAdmin = async (req, res) => {
//     try {
//         const pool = await connectDB();

//         // SQL JOIN query to combine Appointments, Slots, Doctors, and Users (Patients)
//         const result = await pool.request().query(`
//             SELECT 
//                 a.AppointmentId, 
//                 a.Status, 
//                 a.ConsultationType, 
//                 a.BookedAt,
//                 CONVERT(varchar, s.SlotDate, 23) AS SlotDate, 
//                 CONVERT(varchar(5), s.StartTime, 108) AS StartTime, 
//                 CONVERT(varchar(5), s.EndTime, 108) AS EndTime,
//                 d.FullName AS DoctorName, 
//                 d.Phone AS DoctorPhone,
//                 u.FirstName AS PatientFirstName,
//                 u.LastName AS PatientLastName,
//                 u.mobile AS PatientMobile,
//                 u.Gender AS PatientGender
//             FROM Appointments a
//             JOIN DoctorSlots s ON a.SlotId = s.SlotId
//             JOIN Doctors d ON a.DoctorId = d.DoctorId
//             JOIN users u ON a.UserId = u.UserId
//             ORDER BY a.BookedAt DESC
//         `);

//         return res.json({ 
//             success: true, 
//             data: result.recordset, 
//             message: "All appointments fetched for Admin", 
//             error: null 
//         });
//     } catch (error) {
//         console.error("Error in getAllAppointmentsForAdmin:", error);
//         return res.status(500).json({ success: false, data: [], message: "Server Error", error: error.message });
//     }
// };

// module.exports = { getAllAppointmentsForAdmin };
















const { connectDB, sql } = require('../db');

/**
 * @function getAllAppointmentsForAdmin
 * @description Admin Dashboard: Shows all bookings with both Patient and Doctor details
 * @route GET /api/admin/appointments
 */
const getAllAppointmentsForAdmin = async (req, res) => {
    try {
        const pool = await connectDB();

        const result = await pool.request().query(`
            SELECT 
                a.AppointmentId, a.Status, a.ConsultationType, a.BookedAt,
                CONVERT(varchar, s.SlotDate, 23) AS SlotDate, 
                CONVERT(varchar(5), s.StartTime, 108) AS StartTime, 
                CONVERT(varchar(5), s.EndTime, 108) AS EndTime,
                d.FullName AS DoctorName, d.Phone AS DoctorPhone,
                u.FirstName AS PatientFirstName, u.LastName AS PatientLastName,
                u.mobile AS PatientMobile, u.Gender AS PatientGender
            FROM Appointments a
            JOIN DoctorSlots s ON a.SlotId = s.SlotId
            JOIN Doctors d ON a.DoctorId = d.DoctorId
            JOIN users u ON a.UserId = u.UserId
            ORDER BY a.BookedAt DESC
        `);

        return res.json({ success: true, data: result.recordset, message: "All appointments fetched" });
    } catch (error) {
        console.error("Error in getAllAppointmentsForAdmin:", error);
        return res.status(500).json({ success: false, data: [], message: "Server Error", error: error.message });
    }
};

/**
 * @function getDoctorAnalytics
 * @description Industry Standard Doctor Performance & Clinical Analytics
 * @route GET /api/admin/doctor-history/:id
 */
const getDoctorAnalytics = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const pool = await connectDB();

        // 1. Fetch Doctor's Basic Profile
        const profileResult = await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .query(`
                SELECT d.FullName, d.Phone, d.ExperienceYears, sp.Name AS Specialization 
                FROM Doctors d
                LEFT JOIN Specializations sp ON d.SpecializationId = sp.SpecializationId
                WHERE d.DoctorId = @DoctorId
            `);

        if (profileResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        // 2. Fetch Enterprise Performance Metrics (Aggregations)
        // Tracks volume, completion rate, and patient retention (unique patients)
        const metricsResult = await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .query(`
                SELECT 
                    COUNT(AppointmentId) AS TotalAppointments,
                    SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) AS CompletedAppointments,
                    SUM(CASE WHEN Status = 'Cancelled' THEN 1 ELSE 0 END) AS CancelledAppointments,
                    COUNT(DISTINCT UserId) AS UniquePatientsTreated
                FROM Appointments 
                WHERE DoctorId = @DoctorId
            `);

        // 3. Fetch Clinical Trends (Top Reasons for Consultation)
        // Helps Admin know what diseases this doctor treats the most
        const trendsResult = await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .query(`
                SELECT Reason, COUNT(AppointmentId) as CaseCount
                FROM Appointments
                WHERE DoctorId = @DoctorId AND Reason IS NOT NULL
                GROUP BY Reason
                ORDER BY CaseCount DESC
            `);

        return res.json({ 
            success: true, 
            data: {
                profile: profileResult.recordset[0],
                performanceMetrics: metricsResult.recordset[0],
                clinicalTrends: trendsResult.recordset
            }, 
            message: "Doctor analytics fetched successfully" 
        });

    } catch (error) {
        console.error("Error in getDoctorAnalytics:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**    
 * @function getPatientMedicalJourney
 * @description Industry Standard Electronic Health Record (EHR) & Timeline
 * @route GET /api/admin/patient-history/:id
 */
const getPatientMedicalJourney = async (req, res) => {
    try {
        const patientId = req.params.id; // UserId from users table
        const pool = await connectDB();

        // 1. Fetch Patient's Clinical Demographic Profile
        const profileResult = await pool.request()
            .input('UserId', sql.Int, patientId)
            .query(`
                SELECT 
                    FirstName, LastName, mobile, email,
                    dateofbirth AS DOB, gender AS Gender, age AS Age, weightkg AS WeightKg,
                    specialmedicalnotes AS MedicalNotes
                FROM users 
                WHERE UserId = @UserId
            `);

        if (profileResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        // 2. Fetch Chronological Medical Timeline (EHR)
        // Shows exact history of which doctor they saw, when, and for what reason.
        // NOTE: Later, we will JOIN the 'Subscriptions' and 'Medicines' tables here.
        const timelineResult = await pool.request()
            .input('UserId', sql.Int, patientId)
            .query(`
                SELECT 
                    a.AppointmentId, a.Status, a.ConsultationType, a.Reason,
                    CONVERT(varchar, s.SlotDate, 23) AS ConsultationDate,
                    d.FullName AS DoctorName, 
                    sp.Name AS DoctorSpecialization
                FROM Appointments a
                JOIN DoctorSlots s ON a.SlotId = s.SlotId
                JOIN Doctors d ON a.DoctorId = d.DoctorId
                LEFT JOIN Specializations sp ON d.SpecializationId = sp.SpecializationId
                WHERE a.UserId = @UserId
                ORDER BY s.SlotDate DESC, s.StartTime DESC
            `);

        return res.json({ 
            success: true, 
            data: {
                patientProfile: profileResult.recordset[0],
                medicalTimeline: timelineResult.recordset
            }, 
            message: "Patient medical journey fetched successfully" 
        });

    } catch (error) {
        console.error("Error in getPatientMedicalJourney:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};






/**
 * @function verifyPatientReport
 * @description Admin verifies the uploaded blood report to unlock Doctor Booking for the Patient.
 * @route PUT /api/admin/reports/:reportId/verify
 * @access Private (Admin Only)
 */
// const verifyPatientReport = async (req, res) => {
//     try {
//         const reportId = req.params.reportId;
//         const { status, adminNotes } = req.body; 

//         // Validate the incoming status payload
//         if (!['Approved', 'Rejected'].includes(status)) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Status must be exactly 'Approved' or 'Rejected'." 
//             });
//         }

//         const pool = await connectDB();
        
//         // Execute the update query directly as no transaction is required for a single table update
//         const result = await pool.request()
//             .input('ReportId', sql.Int, reportId)
//             .input('Status', sql.NVarChar, status)
//             .input('AdminNotes', sql.NVarChar, adminNotes || null)
//             .query(`
//                 UPDATE PatientReports 
//                 SET VerificationStatus = @Status, 
//                     AdminNotes = @AdminNotes
//                 WHERE ReportId = @ReportId;
                
//                 -- Fetch the associated UserId to seamlessly continue the frontend flow
//                 SELECT UserId FROM PatientReports WHERE ReportId = @ReportId;
//             `);

//         // Ensure the report exists before returning a success response
//         if (result.rowsAffected[0] === 0) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: "Report not found in the database." 
//             });
//         }

//         const patientId = result.recordset[0].UserId;
        

//         return res.status(200).json({ 
//             success: true, 
//             message: `Patient report successfully marked as ${status}.`,
//             data: { patientId: patientId }
//         });
//     } catch (error) {
//         console.error("[Admin Controller] Report Verification Error:", error);
//         return res.status(500).json({ 
//             success: false, 
//             message: "Internal Server Error", 
//             error: error.message 
//         });
//     }
// };
const verifyPatientReport = async (req, res) => {
    try {
        const reportId = req.params.reportId;
        const { status, adminNotes } = req.body; 

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: "Status must be exactly 'Approved' or 'Rejected'." 
            });
        }

        const pool = await connectDB();
        
        // Updated Query: JOIN lagaya taaki frontend aur WhatsApp dono ke liye data mil jaye
        const result = await pool.request()
            .input('ReportId', sql.Int, reportId)
            .input('Status', sql.NVarChar, status)
            .input('AdminNotes', sql.NVarChar, adminNotes || null)
            .query(`
                UPDATE PatientReports 
                SET VerificationStatus = @Status, 
                    AdminNotes = @AdminNotes
                WHERE ReportId = @ReportId;
                
                -- Smart JOIN to get Patient's Phone and Name for WhatsApp
                SELECT PR.UserId, U.mobile, U.FirstName 
                FROM PatientReports PR
                JOIN users U ON PR.UserId = U.UserId
                WHERE PR.ReportId = @ReportId;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Report not found in the database." 
            });
        }

        const patientData = result.recordset[0];
        
        // ==========================================
        // 🚀 ENTERPRISE TRIGGER: Send WhatsApp if Approved
        // ==========================================
        if (status === 'Approved' && patientData.mobile) {
            // We call the function but DO NOT use 'await' here.
            // This prevents the admin's API response from delaying while WhatsApp server responds.
            sendWhatsAppApprovalNotification(patientData.mobile, patientData.FirstName);
        }

        return res.status(200).json({ 
            success: true, 
            message: `Patient report successfully marked as ${status}. Notification triggered.`,
            data: { patientId: patientData.UserId }
        });
    } catch (error) {
        console.error("[Admin Controller] Report Verification Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error", 
            error: error.message 
        });
    }
};

/**
 * @function reassignPatientDoctor
 * @description Admin manually re-assigns a patient to a new default doctor.
 * @route PUT /api/admin/patients/:patientId/reassign
 * @access Private (Admin Only)
 */
const reassignPatientDoctor = async (req, res) => {
    try {
        const patientId = req.params.patientId;
        const { newDoctorId } = req.body; 

        if (!newDoctorId) {
            return res.status(400).json({ success: false, message: "newDoctorId is required." });
        }

        const pool = await connectDB();
        
        // Verify the new doctor is active
        const doctorCheck = await pool.request()
            .input('DoctorId', sql.Int, newDoctorId)
            .query(`SELECT DoctorId FROM Doctors WHERE DoctorId = @DoctorId AND IsActive = 1`);

        if (doctorCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Doctor not found or inactive." });
        }

        // Update the patient's default doctor mapping
        await pool.request()
            .input('UserId', sql.Int, patientId)
            .input('DoctorId', sql.Int, newDoctorId)
            .query(`UPDATE users SET DefaultDoctorId = @DoctorId WHERE UserId = @UserId`);

        return res.status(200).json({ 
            success: true, 
            message: "Patient has been successfully reassigned to the new doctor." 
        });
    } catch (error) {
        console.error("[Admin Controller] Reassign Doctor Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};



module.exports = { 
    getAllAppointmentsForAdmin,
    getDoctorAnalytics,
    getPatientMedicalJourney,
    verifyPatientReport,
    reassignPatientDoctor
};