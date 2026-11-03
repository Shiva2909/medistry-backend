const { connectDB, sql } = require('../db');

/**
 * @function uploadPatientReport
 * @description Handles file upload from patient (New Flow). Saves report with NULL AppointmentId.
 */
const uploadPatientReport = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { reportName, reportType } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Document file is missing." });
        }
        if (!reportName) {
            return res.status(400).json({ success: false, message: "Report name is required." });
        }

        const documentUrl = `/uploads/${req.file.filename}`;
        const pool = await connectDB();
        
        // Pura query result 'result' variable me save kar rahe hain
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .input('ReportName', sql.NVarChar, reportName)
            .input('ReportType', sql.NVarChar, reportType || 'General')
            .input('DocumentUrl', sql.NVarChar, documentUrl)
            .query(`
                INSERT INTO PatientReports (UserId, AppointmentId, ReportName, ReportType, DocumentUrl, VerificationStatus)
                OUTPUT INSERTED.ReportId
                VALUES (@UserId, NULL, @ReportName, @ReportType, @DocumentUrl, 'Pending')
            `);

        // extractiong new report ID from the result set
        const newReportId = result.recordset[0].ReportId;

        // passing reportId and documentUrl in the response for frontend to use
        return res.status(201).json({ 
            success: true, 
            message: "Report uploaded successfully. Waiting for admin verification.",
            data: { 
                reportId: newReportId,
                documentUrl: documentUrl 
            }
        });
    } catch (error) {
        console.error("[EHR] Upload Report Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @function createPrescription
 * @description Doctor creates a prescription. Saves diagnosis and medicines using a SQL Transaction.
 */
const createPrescription = async (req, res) => {
    try {
        const loggedInUserId = req.user.userId; 
        const { appointmentId, patientUserId, diagnosis, specialInstructions, documentUrl, medicines } = req.body;

        const pool = await connectDB();
        
        const doctorCheck = await pool.request()
            .input('UserId', sql.Int, loggedInUserId)
            .query(`SELECT DoctorId FROM Doctors WHERE UserId = @UserId`);
            
        if (doctorCheck.recordset.length === 0) {
            return res.status(403).json({ success: false, message: "Unauthorized access. Doctor profile not found." });
        }
        const doctorId = doctorCheck.recordset[0].DoctorId; 

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);
            
            const presResult = await request
                .input('AppointmentId', sql.Int, appointmentId)
                .input('DoctorId', sql.Int, doctorId)
                .input('UserId', sql.Int, patientUserId)
                .input('Diagnosis', sql.NVarChar, diagnosis)
                .input('SpecialInstructions', sql.NVarChar, specialInstructions || '')
                .input('DocumentUrl', sql.NVarChar, documentUrl || null) 
                .query(`
                    INSERT INTO Prescriptions (AppointmentId, DoctorId, UserId, Diagnosis, SpecialInstructions, DocumentUrl)
                    OUTPUT INSERTED.PrescriptionId
                    VALUES (@AppointmentId, @DoctorId, @UserId, @Diagnosis, @SpecialInstructions, @DocumentUrl)
                `);

            const newPrescriptionId = presResult.recordset[0].PrescriptionId;

            if (medicines && Array.isArray(medicines) && medicines.length > 0) {
                for (let med of medicines) {
                    const medReq = new sql.Request(transaction);
                    await medReq
                        .input('PrescriptionId', sql.Int, newPrescriptionId)
                        .input('MedicineName', sql.NVarChar, med.medicineName)
                        .input('Dosage', sql.NVarChar, med.dosage)
                        .input('Duration', sql.NVarChar, med.duration)
                        .input('Instructions', sql.NVarChar, med.instructions || '')
                        .query(`
                            INSERT INTO PrescriptionItems (PrescriptionId, MedicineName, Dosage, Duration, Instructions)
                            VALUES (@PrescriptionId, @MedicineName, @Dosage, @Duration, @Instructions)
                        `);
                }
            }

            await transaction.commit();
            return res.status(201).json({ 
                success: true, 
                message: "Prescription generated successfully.", 
                data: { prescriptionId: newPrescriptionId } 
            });
        } catch (txnErr) {
            await transaction.rollback();
            throw txnErr; 
        }

    } catch (error) {
        console.error("[EHR] Create Prescription Error:", error);
        return res.status(500).json({ success: false, message: "Failed to generate prescription.", error: error.message });
    }
};

/**
 * @function getPatientMedicalHistory
 * @description God API for Timeline: Fetches uploaded Lab Reports (with Admin Status) and Prescriptions.
 */

const getPatientMedicalHistory = async (req, res) => {
    try {
        const patientUserId = req.params.patientUserId;
        const pool = await connectDB();

        // 1. Fetch Patient Basic Details (Age, Gender, Weight, Height, BMI, Notes)
        const patientResult = await pool.request()
            .input('UserId', sql.Int, patientUserId)
            .query(`
                SELECT 
                    UserId, FirstName, LastName, Age, Gender, 
                    BloodGroup, HeightCm, WeightKg, mobile, specialmedicalnotes
                FROM users 
                WHERE UserId = @UserId
            `);

        if (patientResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const patientData = patientResult.recordset[0];
        
        // Calculate BMI dynamically on backend
        let bmi = null;
        if (patientData.HeightCm && patientData.WeightKg) {
            const heightMeters = patientData.HeightCm / 100;
            bmi = (patientData.WeightKg / (heightMeters * heightMeters)).toFixed(2);
        }

        // Structure patient profile payload
        const patientInfo = {
            userId: patientData.UserId,
            fullName: `${patientData.FirstName || ''} ${patientData.LastName || ''}`.trim(),
            age: patientData.Age,
            gender: patientData.Gender,
            bloodGroup: patientData.BloodGroup,
            height: patientData.HeightCm,
            weight: patientData.WeightKg,
            bmi: bmi ? parseFloat(bmi) : null,
            phone: patientData.mobile,
            medicalNotes: patientData.specialmedicalnotes
        };

        // 2. Fetch Uploaded Reports
        const reportsResult = await pool.request()
            .input('UserId', sql.Int, patientUserId)
            .query(`
                SELECT ReportId, ReportName, ReportType, DocumentUrl, VerificationStatus, UploadedAt, 'Report' AS RecordCategory
                FROM PatientReports
                WHERE UserId = @UserId
             
             
              ORDER BY UploadedAt DESC
            `);

        // 3. Fetch Base Prescriptions (Without nested medicine items)
        const prescriptionsResult = await pool.request()
            .input('UserId', sql.Int, patientUserId)
            .query(`
                SELECT 
                    P.PrescriptionId, P.Diagnosis, P.SpecialInstructions, P.DocumentUrl, P.CreatedAt, 'Prescription' AS RecordCategory,
                    D.FullName AS DoctorName, S.Name AS Specialization 
                FROM Prescriptions P
                LEFT JOIN Doctors D ON P.DoctorId = D.DoctorId
                LEFT JOIN Specializations S ON D.SpecializationId = S.SpecializationId
                WHERE P.UserId = @UserId
                ORDER BY P.CreatedAt DESC
            `);
           const medicinesResult = await pool.request()
            .input('UserId', sql.Int, patientUserId) 
            .query(`
                SELECT PI.ItemId, PI.PrescriptionId, PI.MedicineName, PI.Dosage, PI.Duration, PI.Instructions 
                FROM PrescriptionItems PI
                JOIN Prescriptions P ON PI.PrescriptionId = P.PrescriptionId
                WHERE P.UserId = @UserId
            `);
        // 4. Return unified history object
        return res.status(200).json({
            success: true,
            data: {
                patientProfile: patientInfo,
                reports: reportsResult.recordset,
                prescriptions: prescriptionsResult.recordset,
                medicines: medicinesResult.recordset


            },
            message: "Medical history fetched successfully."
        });

    } catch (error) {
        console.error("[EHR] History Fetch Error:", error);
        return res.status(500).json({ success: false, message: "Error fetching medical history.", error: error.message });
    }
};


/**
 * @function getPrescriptionDetails
 */
const getPrescriptionDetails = async (req, res) => {
    try {
        const { prescriptionId } = req.params;
        const pool = await connectDB();

        const presResult = await pool.request()
            .input('PrescriptionId', sql.Int, prescriptionId)
            .query(`
                SELECT 
                    P.PrescriptionId, P.Diagnosis, P.SpecialInstructions, P.DocumentUrl, P.CreatedAt,
                    D.FullName AS DoctorName, S.Name AS Specialization,
                    U.FirstName AS PatientFirstName, U.LastName AS PatientLastName, U.age AS PatientAge
                FROM Prescriptions P
                LEFT JOIN Doctors D ON P.DoctorId = D.DoctorId
                LEFT JOIN Specializations S ON D.SpecializationId = S.SpecializationId
                LEFT JOIN users U ON P.UserId = U.UserId
                WHERE P.PrescriptionId = @PrescriptionId
            `);

        if (presResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Prescription not found." });
        }

        const medicinesResult = await pool.request()
            .input('PrescriptionId', sql.Int, prescriptionId)
            .query(`
                SELECT ItemId, MedicineName, Dosage, Duration, Instructions 
                FROM PrescriptionItems 
                WHERE PrescriptionId = @PrescriptionId
            `);

        return res.status(200).json({
            success: true,
            data: { prescriptionInfo: presResult.recordset[0], medicines: medicinesResult.recordset },
            message: "Prescription details fetched successfully."
        });

    } catch (error) {
        console.error("[EHR] Fetch Prescription Details Error:", error);
        return res.status(500).json({ success: false, message: "Error fetching prescription details.", error: error.message });
    }
};

module.exports = { uploadPatientReport, createPrescription, getPatientMedicalHistory, getPrescriptionDetails };










