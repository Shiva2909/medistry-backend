// const { connectDB, sql } = require('../db');

// /**
//  * @function createDoctorProfile
//  * @description Admin creates a new doctor profile (Links to an existing user if userId is provided).
//  * @route POST /api/doctors/profile
//  * @access Private (Admin Only)
//  */
// const createDoctorProfile = async (req, res) => {
//     try {
//         const { userId, fullName, specializationId, experienceYears, consultationFee, followupFee, phone, email } = req.body;

//         if (!fullName || !specializationId) {
//             return res.status(200).json({ success: false, message: "Missing required fields: fullName or specializationId" });
//         }

//         const pool = await connectDB();

//         // Check if user already linked to another doctor
//         if (userId) {
//             const checkExisting = await pool.request()
//                 .input('UserId', sql.Int, userId)
//                 .query('SELECT DoctorId FROM Doctors WHERE UserId = @UserId');

//             if (checkExisting.recordset.length > 0) {
//                 return res.status(200).json({ success: false, message: "This user is already linked to a doctor profile." });
//             }
//         }

//         const insertResult = await pool.request()
//             .input('FullName', sql.NVarChar, fullName)
//             .input('SpecializationId', sql.Int, specializationId)
//             .input('ExperienceYears', sql.Int, experienceYears || 0)
//             .input('ConsultationFee', sql.Decimal(10, 2), consultationFee || 0)
//             .input('FollowupFee', sql.Decimal(10, 2), followupFee || 0)
//             .input('Email', sql.NVarChar, email || null)
//             .input('Phone', sql.VarChar, phone || null)
//             .input('UserId', sql.Int, userId || null)
//             .query(`
//                 INSERT INTO Doctors (FullName, SpecializationId, ExperienceYears, ConsultationFee, FollowupFee, Email, Phone, UserId, IsActive) 
//                 OUTPUT INSERTED.DoctorId 
//                 VALUES (@FullName, @SpecializationId, @ExperienceYears, @ConsultationFee, @FollowupFee, @Email, @Phone, @UserId, 1)
//             `);

//         return res.status(201).json({ success: true, message: "Doctor profile created successfully.", data: { doctorId: insertResult.recordset[0].DoctorId } });
//     } catch (error) {
//         console.error("Error in createDoctorProfile:", error);
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// /**
//  * @function addDoctorRegistration
//  * @description Admin adds medical council registration details for KYC.
//  * @route POST /api/doctors/registration
//  * @access Private (Admin Only)
//  */
// const addDoctorRegistration = async (req, res) => {
//     try {
//         const { doctorId, registrationNo, medicalCouncil, state, registrationYear } = req.body;

//         if (!doctorId || !registrationNo || !medicalCouncil) {
//             return res.status(200).json({ success: false, message: "Missing doctorId, registrationNo, or medicalCouncil" });
//         }

//         const pool = await connectDB();
//         await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .input('RegistrationNo', sql.NVarChar, registrationNo)
//             .input('MedicalCouncil', sql.NVarChar, medicalCouncil)
//             .input('State', sql.NVarChar, state || null)
//             .input('RegistrationYear', sql.Int, registrationYear || null)
//             .query(`
//                 INSERT INTO DoctorRegistrations (DoctorId, RegistrationNo, MedicalCouncil, State, RegistrationYear, IsVerified)
//                 VALUES (@DoctorId, @RegistrationNo, @MedicalCouncil, @State, @RegistrationYear, 1) 
//             `); // Admin is adding, so IsVerified is auto set to 1

//         return res.status(201).json({ success: true, message: "Registration details added successfully." });
//     } catch (error) {
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// /**
//  * @function addDoctorLocation
//  * @description Admin adds a physical clinic location for the doctor.
//  * @route POST /api/doctors/location
//  * @access Private (Admin Only)
//  */
// const addDoctorLocation = async (req, res) => {
//     try {
//         const { doctorId, clinicName, address, city, state, pincode, isPrimary } = req.body;

//         if (!doctorId || !clinicName || !address) {
//             return res.status(200).json({ success: false, message: "Missing doctorId, clinicName, or address" });
//         }

//         const pool = await connectDB();
//         await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .input('ClinicName', sql.NVarChar, clinicName)
//             .input('Address', sql.NVarChar, address)
//             .input('City', sql.NVarChar, city || null)
//             .input('State', sql.NVarChar, state || null)
//             .input('Pincode', sql.VarChar, pincode || null)
//             .input('IsPrimary', sql.Bit, isPrimary === undefined ? 0 : isPrimary)
//             .query(`
//                 INSERT INTO DoctorLocations (DoctorId, ClinicName, Address, City, State, Pincode, IsPrimary, IsActive)
//                 VALUES (@DoctorId, @ClinicName, @Address, @City, @State, @Pincode, @IsPrimary, 1)
//             `);

//         return res.status(201).json({ success: true, message: "Clinic location added successfully." });
//     } catch (error) {
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// /**
//  * @function addProfessionalDetails
//  * @description Admin adds bio, languages, and sub-specialization.
//  * @route POST /api/doctors/professional-details
//  * @access Private (Admin Only)
//  */
// const addProfessionalDetails = async (req, res) => {
//     try {
//         const { doctorId, bio, languagesSpoken, subSpecialization } = req.body;

//         const pool = await connectDB();
//         await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .input('Bio', sql.NVarChar, bio || null)
//             .input('LanguagesSpoken', sql.NVarChar, languagesSpoken || null)
//             .input('SubSpecialization', sql.NVarChar, subSpecialization || null)
//             .query(`
//                 INSERT INTO DoctorProfessionalDetails (DoctorId, Bio, LanguagesSpoken, SubSpecialization)
//                 VALUES (@DoctorId, @Bio, @LanguagesSpoken, @SubSpecialization)
//             `);

//         return res.status(201).json({ success: true, message: "Professional details added successfully." });
//     } catch (error) {
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// /**
//  * @function addDoctorDocument
//  * @description Admin uploads document links (Degree/KYC).
//  * @route POST /api/doctors/document
//  * @access Private (Admin Only)
//  */
// const addDoctorDocument = async (req, res) => {
//     try {
//         const { doctorId, documentType, documentUrl } = req.body;

//         const pool = await connectDB();
//         await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .input('DocumentType', sql.VarChar, documentType)
//             .input('DocumentUrl', sql.NVarChar, documentUrl)
//             .query(`
//                 INSERT INTO DoctorDocuments (DoctorId, DocumentType, DocumentUrl)
//                 VALUES (@DoctorId, @DocumentType, @DocumentUrl)
//             `);

//         return res.status(201).json({ success: true, message: "Document added successfully." });
//     } catch (error) {
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// /**
//  * @function updateDoctorProfile
//  * @description Admin updates existing doctor details.
//  * @route PUT /api/doctors/:id
//  * @access Private (Admin Only)
//  */
// const updateDoctorProfile = async (req, res) => {
//     try {
//         const doctorId = req.params.id;
//         const { fullName, consultationFee, followupFee, experienceYears, phone } = req.body;

//         const pool = await connectDB();
//         await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .input('FullName', sql.NVarChar, fullName)
//             .input('ConsultationFee', sql.Decimal(10, 2), consultationFee)
//             .input('FollowupFee', sql.Decimal(10, 2), followupFee)
//             .input('ExperienceYears', sql.Int, experienceYears)
//             .input('Phone', sql.VarChar, phone)
//             .query(`
//                 UPDATE Doctors 
//                 SET 
//                     FullName = ISNULL(@FullName, FullName),
//                     ConsultationFee = ISNULL(@ConsultationFee, ConsultationFee),
//                     FollowupFee = ISNULL(@FollowupFee, FollowupFee),
//                     ExperienceYears = ISNULL(@ExperienceYears, ExperienceYears),
//                     Phone = ISNULL(@Phone, Phone)
//                 WHERE DoctorId = @DoctorId
//             `);

//         return res.status(200).json({ success: true, message: "Doctor profile updated successfully." });
//     } catch (error) {
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// /**
//  * @function deleteDoctor (Soft Delete)
//  * @description Admin deactivates a doctor (Does not delete record from DB).
//  * @route DELETE /api/doctors/:id
//  * @access Private (Admin Only)
//  */
// const deleteDoctor = async (req, res) => {
//     try {
//         const doctorId = req.params.id;

//         const pool = await connectDB();
//         // We only set IsActive = 0 to preserve appointment history
//         await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .query(`UPDATE Doctors SET IsActive = 0 WHERE DoctorId = @DoctorId`);

//         return res.status(200).json({ success: true, message: "Doctor profile has been deactivated (Soft Deleted)." });
//     } catch (error) {
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// /**
//  * @function getDoctorList
//  * @description Public API for patients to see the list of active doctors.
//  * @route GET /api/doctors
//  * @access Public (Patients & Everyone)
//  */
// const getDoctorList = async (req, res) => {
//     try {
//         const pool = await connectDB();
//         // Returns only active doctors
//         const result = await pool.request().query(`
//             SELECT d.DoctorId, d.FullName, d.ExperienceYears, d.ConsultationFee, s.Name AS Specialization 
//             FROM Doctors d
//             JOIN Specializations s ON d.SpecializationId = s.SpecializationId
//             WHERE d.IsActive = 1
//         `);

//         return res.status(200).json({ success: true, data: result.recordset });
//     } catch (error) {
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// /**
//  * @function getDoctorFullProfile
//  * @description Public API to view complete doctor details including locations and bio.
//  * @route GET /api/doctors/:id
//  * @access Public (Patients & Everyone)
//  */
// const getDoctorFullProfile = async (req, res) => {
//     try {
//         const doctorId = req.params.id;
//         const pool = await connectDB();

//         // 1. Get Basic Profile
//         const profile = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
//             SELECT d.DoctorId, d.FullName, d.ExperienceYears, d.ConsultationFee, d.FollowupFee, d.IsActive, s.Name AS Specialization 
//             FROM Doctors d JOIN Specializations s ON d.SpecializationId = s.SpecializationId WHERE d.DoctorId = @DoctorId
//         `);

//         if (profile.recordset.length === 0) {
//             return res.status(200).json({ success: false, message: "Doctor not found" });
//         }

//         // 2. Get Professional Details
//         const details = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
//             SELECT Bio, LanguagesSpoken, SubSpecialization FROM DoctorProfessionalDetails WHERE DoctorId = @DoctorId
//         `);

//         // 3. Get Locations
//         const locations = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
//             SELECT ClinicName, Address, City, State, Pincode, IsPrimary FROM DoctorLocations WHERE DoctorId = @DoctorId AND IsActive = 1
//         `);

//         const finalData = {
//             ...profile.recordset[0],
//             professionalDetails: details.recordset.length > 0 ? details.recordset[0] : null,
//             clinics: locations.recordset
//         };

//         return res.status(200).json({ success: true, data: finalData });
//     } catch (error) {
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// module.exports = {
//     createDoctorProfile,
//     addDoctorRegistration,
//     addDoctorLocation,
//     addProfessionalDetails,
//     addDoctorDocument,
//     updateDoctorProfile,
//     deleteDoctor,
//     getDoctorList,
//     getDoctorFullProfile
// };










const { connectDB, sql } = require('../db');

/**
 * @function createDoctorFullProfile
 * @description Master API: Admin creates a complete doctor profile with all related details in one go using SQL Transactions.
 * @route POST /api/doctors/profile
 * @access Private (Admin Only)
 */
const createDoctorFullProfile = async (req, res) => {
    let pool;
    let transaction;
    
    try {
        const { 
            userId, fullName, specializationId, experienceYears, consultationFee, followupFee, phone, email,
            registration, // Object: { registrationNo, medicalCouncil, state, registrationYear }
            location,     // Object: { clinicName, address, city, state, pincode, isPrimary }
            professional, // Object: { bio, languagesSpoken, subSpecialization }
            documents     // Array of Objects: [{ documentType, documentUrl }]
        } = req.body;

        // Basic validation
        if (!fullName || !specializationId) {
            return res.status(200).json({ success: false, message: "Missing required fields: fullName or specializationId" });
        }

        pool = await connectDB();
        
        // Check if user is already linked to another doctor
        if (userId) {
            const checkExisting = await pool.request()
                .input('UserId', sql.Int, userId)
                .query('SELECT DoctorId FROM Doctors WHERE UserId = @UserId');

            if (checkExisting.recordset.length > 0) {
                return res.status(200).json({ success: false, message: "This user is already linked to a doctor profile." });
            }
        }

        // ==========================================
        // BEGIN TRANSACTION (Safe Multi-Table Insert)
        // ==========================================
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // 1. Insert into Doctors (Main Table)
        request.input('FullName', sql.NVarChar, fullName);
        request.input('SpecializationId', sql.Int, specializationId);
        request.input('ExperienceYears', sql.Int, experienceYears || 0);
        request.input('ConsultationFee', sql.Decimal(10, 2), consultationFee || 0);
        request.input('FollowupFee', sql.Decimal(10, 2), followupFee || 0);
        request.input('Email', sql.NVarChar, email || null);
        request.input('Phone', sql.VarChar, phone || null);
        request.input('UserId', sql.Int, userId || null);
        
        const docResult = await request.query(`
            INSERT INTO Doctors (FullName, SpecializationId, ExperienceYears, ConsultationFee, FollowupFee, Email, Phone, UserId, IsActive) 
            OUTPUT INSERTED.DoctorId 
            VALUES (@FullName, @SpecializationId, @ExperienceYears, @ConsultationFee, @FollowupFee, @Email, @Phone, @UserId, 1)
        `);
        
        const newDoctorId = docResult.recordset[0].DoctorId;

        // 2. Insert Registration Details (If provided)
        if (registration && registration.registrationNo) {
            const regReq = new sql.Request(transaction);
            await regReq
                .input('DoctorId', sql.Int, newDoctorId)
                .input('RegistrationNo', sql.NVarChar, registration.registrationNo)
                .input('MedicalCouncil', sql.NVarChar, registration.medicalCouncil || null)
                .input('State', sql.NVarChar, registration.state || null)
                .input('RegistrationYear', sql.Int, registration.registrationYear || null)
                .query(`
                    INSERT INTO DoctorRegistrations (DoctorId, RegistrationNo, MedicalCouncil, State, RegistrationYear, IsVerified)
                    VALUES (@DoctorId, @RegistrationNo, @MedicalCouncil, @State, @RegistrationYear, 1) 
                `);
        }

        // 3. Insert Clinic Location (If provided)
        if (location && location.clinicName) {
            const locReq = new sql.Request(transaction);
            await locReq
                .input('DoctorId', sql.Int, newDoctorId)
                .input('ClinicName', sql.NVarChar, location.clinicName)
                .input('Address', sql.NVarChar, location.address || null)
                .input('City', sql.NVarChar, location.city || null)
                .input('State', sql.NVarChar, location.state || null)
                .input('Pincode', sql.VarChar, location.pincode || null)
                .input('IsPrimary', sql.Bit, location.isPrimary === undefined ? 1 : location.isPrimary)
                .query(`
                    INSERT INTO DoctorLocations (DoctorId, ClinicName, Address, City, State, Pincode, IsPrimary, IsActive)
                    VALUES (@DoctorId, @ClinicName, @Address, @City, @State, @Pincode, @IsPrimary, 1)
                `);
        }

        // 4. Insert Professional Details / Bio (If provided)
        if (professional) {
            const profReq = new sql.Request(transaction);
            await profReq
                .input('DoctorId', sql.Int, newDoctorId)
                .input('Bio', sql.NVarChar, professional.bio || null)
                .input('LanguagesSpoken', sql.NVarChar, professional.languagesSpoken || null)
                .input('SubSpecialization', sql.NVarChar, professional.subSpecialization || null)
                .query(`
                    INSERT INTO DoctorProfessionalDetails (DoctorId, Bio, LanguagesSpoken, SubSpecialization)
                    VALUES (@DoctorId, @Bio, @LanguagesSpoken, @SubSpecialization)
                `);
        }

        // 5. Insert Documents (If array is provided)
        if (documents && Array.isArray(documents) && documents.length > 0) {
            for (const doc of documents) {
                if (doc.documentType && doc.documentUrl) {
                    const docReq = new sql.Request(transaction);
                    await docReq
                        .input('DoctorId', sql.Int, newDoctorId)
                        .input('DocumentType', sql.VarChar, doc.documentType)
                        .input('DocumentUrl', sql.NVarChar, doc.documentUrl)
                        .query(`
                            INSERT INTO DoctorDocuments (DoctorId, DocumentType, DocumentUrl)
                            VALUES (@DoctorId, @DocumentType, @DocumentUrl)
                        `);
                }
            }
        }

        // Commit transaction if all inserts succeed
        await transaction.commit();

        return res.status(201).json({ 
            success: true, 
            message: "Complete Doctor profile created successfully.", 
            data: { doctorId: newDoctorId } 
        });

    } catch (error) {
        // Rollback everything if any single query fails
        if (transaction) await transaction.rollback();
        console.error("Error in createDoctorFullProfile:", error);
        return res.status(200).json({ success: false, message: "Server Error during profile creation", error: error.message });
    }
};

/**
 * @function updateDoctorFullProfile
 * @description Master API: Updates any part of the doctor's profile in a single request.
 * @route PUT /api/doctors/:id
 * @access Private (Admin Only)
 */
const updateDoctorFullProfile = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const { 
            fullName, consultationFee, followupFee, experienceYears, phone, email, specializationId,
            professional, location 
        } = req.body;

        const pool = await connectDB();

        // 1. Update Main Doctor Details
        await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .input('FullName', sql.NVarChar, fullName)
            .input('SpecializationId', sql.Int, specializationId)
            .input('ConsultationFee', sql.Decimal(10, 2), consultationFee)
            .input('FollowupFee', sql.Decimal(10, 2), followupFee)
            .input('ExperienceYears', sql.Int, experienceYears)
            .input('Phone', sql.VarChar, phone)
            .input('Email', sql.NVarChar, email)
            .query(`
                UPDATE Doctors 
                SET 
                    FullName = ISNULL(@FullName, FullName),
                    SpecializationId = ISNULL(@SpecializationId, SpecializationId),
                    ConsultationFee = ISNULL(@ConsultationFee, ConsultationFee),
                    FollowupFee = ISNULL(@FollowupFee, FollowupFee),
                    ExperienceYears = ISNULL(@ExperienceYears, ExperienceYears),
                    Phone = ISNULL(@Phone, Phone),
                    Email = ISNULL(@Email, Email)
                WHERE DoctorId = @DoctorId
            `);

        // 2. Update Professional Details (UPSERT: Update if exists, else Insert)
        if (professional) {
            await pool.request()
                .input('DoctorId', sql.Int, doctorId)
                .input('Bio', sql.NVarChar, professional.bio)
                .input('LanguagesSpoken', sql.NVarChar, professional.languagesSpoken)
                .input('SubSpecialization', sql.NVarChar, professional.subSpecialization)
                .query(`
                    IF EXISTS (SELECT 1 FROM DoctorProfessionalDetails WHERE DoctorId = @DoctorId)
                        UPDATE DoctorProfessionalDetails 
                        SET Bio = ISNULL(@Bio, Bio), LanguagesSpoken = ISNULL(@LanguagesSpoken, LanguagesSpoken), SubSpecialization = ISNULL(@SubSpecialization, SubSpecialization)
                        WHERE DoctorId = @DoctorId
                    ELSE
                        INSERT INTO DoctorProfessionalDetails (DoctorId, Bio, LanguagesSpoken, SubSpecialization)
                        VALUES (@DoctorId, @Bio, @LanguagesSpoken, @SubSpecialization)
                `);
        }

        // 3. Update Primary Location
        if (location) {
            await pool.request()
                .input('DoctorId', sql.Int, doctorId)
                .input('ClinicName', sql.NVarChar, location.clinicName)
                .input('Address', sql.NVarChar, location.address)
                .input('City', sql.NVarChar, location.city)
                .input('State', sql.NVarChar, location.state)
                .input('Pincode', sql.VarChar, location.pincode)
                .query(`
                    IF EXISTS (SELECT 1 FROM DoctorLocations WHERE DoctorId = @DoctorId AND IsPrimary = 1)
                        UPDATE DoctorLocations 
                        SET ClinicName = ISNULL(@ClinicName, ClinicName), Address = ISNULL(@Address, Address), 
                            City = ISNULL(@City, City), State = ISNULL(@State, State), Pincode = ISNULL(@Pincode, Pincode)
                        WHERE DoctorId = @DoctorId AND IsPrimary = 1
                    ELSE
                        INSERT INTO DoctorLocations (DoctorId, ClinicName, Address, City, State, Pincode, IsPrimary, IsActive)
                        VALUES (@DoctorId, @ClinicName, @Address, @City, @State, @Pincode, 1, 1)
                `);
        }

        return res.status(200).json({ success: true, message: "Doctor profile updated successfully." });
    } catch (error) {
        console.error("Error in updateDoctorFullProfile:", error);
        return res.status(200).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function deleteDoctor 
 * @description Admin deactivates a doctor (Soft Delete - Does not delete record from DB).
 * @route DELETE /api/doctors/:id
 * @access Private (Admin Only)
 */
const deleteDoctor = async (req, res) => {
    try {
        const doctorId = req.params.id;

        const pool = await connectDB();
        // We only set IsActive = 0 to preserve appointment history
        await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .query(`UPDATE Doctors SET IsActive = 0 WHERE DoctorId = @DoctorId`);

        return res.status(200).json({ success: true, message: "Doctor profile has been deactivated (Soft Deleted)." });
    } catch (error) {
        return res.status(200).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function getDoctorList
 * @description Public API for patients to see the list of active doctors.
 * @route GET /api/doctors
 * @access Public (Patients & Everyone)
 */
const getDoctorList = async (req, res) => {
    try {
        const pool = await connectDB();
        // Returns only active doctors
        const result = await pool.request().query(`
            SELECT d.DoctorId, d.FullName, d.ExperienceYears, d.ConsultationFee, s.Name AS Specialization 
            FROM Doctors d
            JOIN Specializations s ON d.SpecializationId = s.SpecializationId
            WHERE d.IsActive = 1
        `);

        return res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        return res.status(200).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function getDoctorFullProfile
 * @description Public API to view complete doctor details including locations and bio.
 * @route GET /api/doctors/:id
 * @access Public (Patients & Everyone)
 */
const getDoctorFullProfile = async (req, res) => {
    try {
        const doctorId = req.params.id;
        const pool = await connectDB();

        // 1. Get Basic Profile
        const profile = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
            SELECT d.DoctorId, d.FullName, d.ExperienceYears, d.ConsultationFee, d.FollowupFee, d.IsActive, s.Name AS Specialization 
            FROM Doctors d JOIN Specializations s ON d.SpecializationId = s.SpecializationId WHERE d.DoctorId = @DoctorId
        `);

        if (profile.recordset.length === 0) {
            return res.status(200).json({ success: false, message: "Doctor not found" });
        }

        // 2. Get Professional Details
        const details = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
            SELECT Bio, LanguagesSpoken, SubSpecialization FROM DoctorProfessionalDetails WHERE DoctorId = @DoctorId
        `);

        // 3. Get Locations
        const locations = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
            SELECT ClinicName, Address, City, State, Pincode, IsPrimary FROM DoctorLocations WHERE DoctorId = @DoctorId AND IsActive = 1
        `);

        const finalData = {
            ...profile.recordset[0],
            professionalDetails: details.recordset.length > 0 ? details.recordset[0] : null,
            clinics: locations.recordset
        };

        return res.status(200).json({ success: true, data: finalData });
    } catch (error) {
        return res.status(200).json({ success: false, message: "Server Error", error: error.message });
    }
};

module.exports = {
    createDoctorFullProfile,
    updateDoctorFullProfile,
    deleteDoctor,
    getDoctorList,
    getDoctorFullProfile
};         