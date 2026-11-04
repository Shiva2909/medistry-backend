// const { connectDB, sql } = require('../db');

// /**
//  * @function getPatientDashboardProfile
//  * @description Single API for Mobile App Home Screen. 
//  * Fetches User details, Active Plan (with Perks), Dedicated Doctor, and Report Status.
//  */
// const getPatientDashboardProfile = async (req, res) => {
//     try {
//         const userId = req.user.userId;
//         const pool = await connectDB();

//         // 1. Fetch User Profile, Active Subscription, Plan PERKS, and Dedicated Doctor in one powerful JOIN
//         const profileResult = await pool.request()
//             .input('UserId', sql.Int, userId)
//             .query(`
//                 SELECT 
//                     u.UserId, u.FirstName, u.LastName, u.Age, u.WeightKg, u.mobile AS Phone,
//                     u.DefaultDoctorId,
//                     d.FullName AS DedicatedDoctorName,
//                     d.ProfileImageUrl AS DedicatedDoctorPhoto,
//                     -- THE FIX: Get PlanName from SubscriptionPlans (sp), not UserSubscriptions (s)
//                     sp.PlanName AS ActivePlanName, 
//                     s.EndDate AS PlanExpiryDate,
//                     DATEDIFF(day, GETDATE(), s.EndDate) AS DaysRemaining,
//                     sp.Perks AS PlanPerks
//                 FROM users u
//                 LEFT JOIN Doctors d ON u.DefaultDoctorId = d.DoctorId
//                 LEFT JOIN UserSubscriptions s ON u.UserId = s.UserId 
//                                               AND s.Status = 'Active' 
//                                               AND GETDATE() BETWEEN s.StartDate AND s.EndDate
//                 LEFT JOIN SubscriptionPlans sp ON s.PlanId = sp.PlanId
//                 WHERE u.UserId = @UserId
//             `);

//         if (profileResult.recordset.length === 0) {
//             return res.status(404).json({ success: false, message: "Patient profile not found." });
//         }

//         const profile = profileResult.recordset[0];

//         // 2. Fetch Latest Gatekeeper/Report Status (Smart Logic)
//         const reportResult = await pool.request()
//             .input('UserId', sql.Int, userId)
//             .query(`
//                 SELECT TOP 1 VerificationStatus, ReportName 
//                 FROM PatientReports 
//                 WHERE UserId = @UserId 
//                 ORDER BY 
//                     CASE 
//                         WHEN VerificationStatus = 'Approved' AND AppointmentId IS NULL THEN 1 
//                         ELSE 2 
//                     END ASC,
//                     UploadedAt DESC
//             `);
//         const latestReportStatus = reportResult.recordset.length > 0 ? reportResult.recordset[0] : null;

//         // Parse perks safely if they exist
//         let parsedPerks = [];
//         if (profile.PlanPerks) {
//             try {
//                 parsedPerks = JSON.parse(profile.PlanPerks);
//             } catch (e) {
//                 console.error("[Dashboard] Error parsing perks JSON", e);
//             }
//         }

//         // 3. Structure the exact payload Frontend needs for an Enterprise UI
//         return res.status(200).json({
//             success: true,
//             data: {
//                 user: {
//                     fullName: `${profile.FirstName} ${profile.LastName}`,
//                     age: profile.Age,
//                     weight: profile.WeightKg,
//                     phone: profile.Phone
//                 },
//                 subscription: profile.ActivePlanName ? {
//                     planName: profile.ActivePlanName,
//                     daysRemaining: profile.DaysRemaining,
//                     expiryDate: profile.PlanExpiryDate,
//                     perks: parsedPerks
//                 } : null,
//                 careTeam: profile.DefaultDoctorId ? {
//                     doctorId: profile.DefaultDoctorId,
//                     doctorName: profile.DedicatedDoctorName,
//                     doctorPhoto: profile.DedicatedDoctorPhoto
//                 } : null,
//                 gatekeeper: latestReportStatus ? {
//                     status: latestReportStatus.VerificationStatus,
//                     reportName: latestReportStatus.ReportName
//                 } : null
//             },
//             message: "Dashboard data fetched successfully."
//         });

//     } catch (error) {
//         console.error("[Patient] Dashboard Fetch Error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };

// module.exports = {
//     getPatientDashboardProfile
// };



const { connectDB, sql } = require('../db');

/**
 * @function getPatientDashboardProfile
 * @description Single API for Mobile App Home Screen. 
 * Fetches User details, Active Plan, Dedicated Doctor, Report Status, and Current Medicines.
 */
// const getPatientDashboardProfile = async (req, res) => {
//     try {
//         const userId = req.user.userId;
//         const pool = await connectDB();

//         // 1. Fetch User Profile, Active Subscription, Plan PERKS, and Dedicated Doctor
//         const profileResult = await pool.request()
//             .input('UserId', sql.Int, userId)
//             .query(`
//                 SELECT 
//                     u.UserId, u.FirstName, u.LastName, u.Age, u.WeightKg, u.mobile AS Phone,
//                     u.DefaultDoctorId,
//                     d.FullName AS DedicatedDoctorName,
//                     d.ProfileImageUrl AS DedicatedDoctorPhoto,
//                     sp.PlanName AS ActivePlanName, 
//                     s.EndDate AS PlanExpiryDate,
//                     DATEDIFF(day, GETDATE(), s.EndDate) AS DaysRemaining,
//                     sp.Perks AS PlanPerks
//                 FROM users u
//                 LEFT JOIN Doctors d ON u.DefaultDoctorId = d.DoctorId
//                 LEFT JOIN UserSubscriptions s ON u.UserId = s.UserId 
//                                               AND s.Status = 'Active' 
//                                               AND GETDATE() BETWEEN s.StartDate AND s.EndDate
//                 LEFT JOIN SubscriptionPlans sp ON s.PlanId = sp.PlanId
//                 WHERE u.UserId = @UserId
//             `);

//         if (profileResult.recordset.length === 0) {
//             return res.status(404).json({ success: false, message: "Patient profile not found." });
//         }

//         const profile = profileResult.recordset[0];

//         // 2. Fetch Latest Gatekeeper/Report Status
//         const reportResult = await pool.request()
//             .input('UserId', sql.Int, userId)
//             .query(`
//                 SELECT TOP 1 VerificationStatus, ReportName 
//                 FROM PatientReports 
//                 WHERE UserId = @UserId 
//                 ORDER BY 
//                     CASE 
//                         WHEN VerificationStatus = 'Approved' AND AppointmentId IS NULL THEN 1 
//                         ELSE 2 
//                     END ASC,
//                     UploadedAt DESC
//             `);
//         const latestReportStatus = reportResult.recordset.length > 0 ? reportResult.recordset[0] : null;

//         // 3. Fetch Current Active Prescription (Precautions & Medicines)
//         const latestPrescriptionResult = await pool.request()
//             .input('UserId', sql.Int, userId)
//             .query(`
//                 SELECT TOP 1 PrescriptionId, SpecialInstructions AS Precautions, CreatedAt 
//                 FROM Prescriptions 
//                 WHERE UserId = @UserId 
//                 ORDER BY CreatedAt DESC
//             `);

//         let currentPrescription = null;
//         if (latestPrescriptionResult.recordset.length > 0) {
//             const prescriptionData = latestPrescriptionResult.recordset[0];
            
//             // Fetch medicines for this specific latest prescription
//             const medicinesResult = await pool.request()
//                 .input('PrescriptionId', sql.Int, prescriptionData.PrescriptionId)
//                 .query(`
//                     SELECT MedicineName, Dosage, Duration, Instructions 
//                     FROM PrescriptionItems 
//                     WHERE PrescriptionId = @PrescriptionId
//                 `);

//             currentPrescription = {
//                 prescriptionDate: prescriptionData.CreatedAt,
//                 precautions: prescriptionData.Precautions,
//                 medicines: medicinesResult.recordset
//             };
//         }

//         // Parse perks safely
//         let parsedPerks = [];
//         if (profile.PlanPerks) {
//             try {
//                 parsedPerks = JSON.parse(profile.PlanPerks);
//             } catch (e) {
//                 console.error("[Dashboard] Error parsing perks JSON", e);
//             }
//         }

//         // 4. Structure the exact payload
//         return res.status(200).json({
//             success: true,
//             data: {
//                 user: {
//                     fullName: `${profile.FirstName} ${profile.LastName}`,
//                     age: profile.Age,
//                     weight: profile.WeightKg,
//                     phone: profile.Phone
//                 },
//                 subscription: profile.ActivePlanName ? {
//                     planName: profile.ActivePlanName,
//                     daysRemaining: profile.DaysRemaining,
//                     expiryDate: profile.PlanExpiryDate,
//                     perks: parsedPerks
//                 } : null,
//                 careTeam: profile.DefaultDoctorId ? {
//                     doctorId: profile.DefaultDoctorId,
//                     doctorName: profile.DedicatedDoctorName,
//                     doctorPhoto: profile.DedicatedDoctorPhoto
//                 } : null,
//                 gatekeeper: latestReportStatus ? {
//                     status: latestReportStatus.VerificationStatus,
//                     reportName: latestReportStatus.ReportName
//                 } : null,
//                 // New additions for current routine
//                 currentRoutine: currentPrescription 
//             },
//             message: "Dashboard data fetched successfully."
//         });

//     } catch (error) {
//         console.error("[Patient] Dashboard Fetch Error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };
const getPatientDashboardProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const pool = await connectDB();

        // 1. Fetch User Profile, Active Subscription, Plan PERKS, and Dedicated Doctor
        const profileResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT 
                    u.UserId, u.FirstName, u.LastName, u.Age, u.WeightKg, u.mobile AS Phone,
                    u.DefaultDoctorId,
                    d.FullName AS DedicatedDoctorName,
                    d.ProfileImageUrl AS DedicatedDoctorPhoto,
                    sp.PlanName AS ActivePlanName, 
                    s.EndDate AS PlanExpiryDate,
                    DATEDIFF(day, GETDATE(), s.EndDate) AS DaysRemaining,
                    sp.Perks AS PlanPerks
                FROM users u
                LEFT JOIN Doctors d ON u.DefaultDoctorId = d.DoctorId
                LEFT JOIN UserSubscriptions s ON u.UserId = s.UserId 
                                            AND s.Status = 'Active' 
                                            AND GETDATE() BETWEEN s.StartDate AND s.EndDate
                LEFT JOIN SubscriptionPlans sp ON s.PlanId = sp.PlanId
                WHERE u.UserId = @UserId
            `);

        if (profileResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Patient profile not found." });
        }

        const profile = profileResult.recordset[0];

        // 2. Fetch Latest Gatekeeper/Report Status
        const reportResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT TOP 1 VerificationStatus, ReportName 
                FROM PatientReports 
                WHERE UserId = @UserId 
                ORDER BY 
                    CASE 
                        WHEN VerificationStatus = 'Approved' AND AppointmentId IS NULL THEN 1 
                        ELSE 2 
                    END ASC,
                    UploadedAt DESC
            `);
        const latestReportStatus = reportResult.recordset.length > 0 ? reportResult.recordset[0] : null;

        // 3. Fetch Current Active Prescription (Precautions & Medicines)
        const latestPrescriptionResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT TOP 1 PrescriptionId, SpecialInstructions AS Precautions, CreatedAt 
                FROM Prescriptions 
                WHERE UserId = @UserId 
                ORDER BY CreatedAt DESC
            `);

        let currentPrescription = null;
        if (latestPrescriptionResult.recordset.length > 0) {
            const prescriptionData = latestPrescriptionResult.recordset[0];
            
            // Fetch medicines for this specific latest prescription
            const medicinesResult = await pool.request()
                .input('PrescriptionId', sql.Int, prescriptionData.PrescriptionId)
                .query(`
                    SELECT MedicineName, Dosage, Duration, Instructions 
                    FROM PrescriptionItems 
                    WHERE PrescriptionId = @PrescriptionId
                `);

            currentPrescription = {
                prescriptionDate: prescriptionData.CreatedAt,
                precautions: prescriptionData.Precautions,
                medicines: medicinesResult.recordset
            };
        }

        // Parse perks safely
        let parsedPerks = [];
        if (profile.PlanPerks) {
            try {
                parsedPerks = JSON.parse(profile.PlanPerks);
            } catch (e) {
                console.error("[Dashboard] Error parsing perks JSON", e);
            }
        }

        // 4. Structure the exact payload
        return res.status(200).json({
            success: true,
            data: {
                user: {
                    fullName: `${profile.FirstName || ''} ${profile.LastName || ''}`.trim(),
                    age: profile.Age,
                    weight: profile.WeightKg,
                    phone: profile.Phone
                },
                subscription: profile.ActivePlanName ? {
                    planName: profile.ActivePlanName,
                    daysRemaining: profile.DaysRemaining,
                    expiryDate: profile.PlanExpiryDate,
                    perks: parsedPerks
                } : null,
                careTeam: profile.DefaultDoctorId ? {
                    doctorId: profile.DefaultDoctorId,
                    doctorName: profile.DedicatedDoctorName,
                    doctorPhoto: profile.DedicatedDoctorPhoto
                } : null,
                gatekeeper: latestReportStatus ? {
                    status: latestReportStatus.VerificationStatus,
                    reportName: latestReportStatus.ReportName
                } : null,
                currentRoutine: currentPrescription 
            },
            message: "Dashboard data fetched successfully."
        });

    } catch (error) {
        console.error("[Patient] Dashboard Fetch Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};
module.exports = {
    getPatientDashboardProfile
};