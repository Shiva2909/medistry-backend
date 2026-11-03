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










// const { connectDB, sql } = require('../db');

// /**
//  * @function createDoctorFullProfile
//  * @description Master API: Admin creates a complete doctor profile with all related details in one go using SQL Transactions.
//  * @route POST /api/doctors/profile
//  * @access Private (Admin Only)
//  */
// const createDoctorFullProfile = async (req, res) => {
//     let pool;
//     let transaction;
    
//     try {
//         const { 
//             userId, fullName, specializationId, experienceYears, consultationFee, followupFee, phone, email,
//             registration, // Object: { registrationNo, medicalCouncil, state, registrationYear }
//             location,     // Object: { clinicName, address, city, state, pincode, isPrimary }
//             professional, // Object: { bio, languagesSpoken, subSpecialization }
//             documents     // Array of Objects: [{ documentType, documentUrl }]
//         } = req.body;

//         // Basic validation
//         if (!fullName || !specializationId) {
//             return res.status(200).json({ success: false, message: "Missing required fields: fullName or specializationId" });
//         }

//         pool = await connectDB();
        
//         // Check if user is already linked to another doctor
//         if (userId) {
//             const checkExisting = await pool.request()
//                 .input('UserId', sql.Int, userId)
//                 .query('SELECT DoctorId FROM Doctors WHERE UserId = @UserId');

//             if (checkExisting.recordset.length > 0) {
//                 return res.status(200).json({ success: false, message: "This user is already linked to a doctor profile." });
//             }
//         }

//         // ==========================================
//         // BEGIN TRANSACTION (Safe Multi-Table Insert)
//         // ==========================================
//         transaction = new sql.Transaction(pool);
//         await transaction.begin();

//         const request = new sql.Request(transaction);

//         // 1. Insert into Doctors (Main Table)
//         request.input('FullName', sql.NVarChar, fullName);
//         request.input('SpecializationId', sql.Int, specializationId);
//         request.input('ExperienceYears', sql.Int, experienceYears || 0);
//         request.input('ConsultationFee', sql.Decimal(10, 2), consultationFee || 0);
//         request.input('FollowupFee', sql.Decimal(10, 2), followupFee || 0);
//         request.input('Email', sql.NVarChar, email || null);
//         request.input('Phone', sql.VarChar, phone || null);
//         request.input('UserId', sql.Int, userId || null);
        
//         const docResult = await request.query(`
//             INSERT INTO Doctors (FullName, SpecializationId, ExperienceYears, ConsultationFee, FollowupFee, Email, Phone, UserId, IsActive) 
//             OUTPUT INSERTED.DoctorId 
//             VALUES (@FullName, @SpecializationId, @ExperienceYears, @ConsultationFee, @FollowupFee, @Email, @Phone, @UserId, 1)
//         `);
        
//         const newDoctorId = docResult.recordset[0].DoctorId;

//         // 2. Insert Registration Details (If provided)
//         if (registration && registration.registrationNo) {
//             const regReq = new sql.Request(transaction);
//             await regReq
//                 .input('DoctorId', sql.Int, newDoctorId)
//                 .input('RegistrationNo', sql.NVarChar, registration.registrationNo)
//                 .input('MedicalCouncil', sql.NVarChar, registration.medicalCouncil || null)
//                 .input('State', sql.NVarChar, registration.state || null)
//                 .input('RegistrationYear', sql.Int, registration.registrationYear || null)
//                 .query(`
//                     INSERT INTO DoctorRegistrations (DoctorId, RegistrationNo, MedicalCouncil, State, RegistrationYear, IsVerified)
//                     VALUES (@DoctorId, @RegistrationNo, @MedicalCouncil, @State, @RegistrationYear, 1) 
//                 `);
//         }

//         // 3. Insert Clinic Location (If provided)
//         if (location && location.clinicName) {
//             const locReq = new sql.Request(transaction);
//             await locReq
//                 .input('DoctorId', sql.Int, newDoctorId)
//                 .input('ClinicName', sql.NVarChar, location.clinicName)
//                 .input('Address', sql.NVarChar, location.address || null)
//                 .input('City', sql.NVarChar, location.city || null)
//                 .input('State', sql.NVarChar, location.state || null)
//                 .input('Pincode', sql.VarChar, location.pincode || null)
//                 .input('IsPrimary', sql.Bit, location.isPrimary === undefined ? 1 : location.isPrimary)
//                 .query(`
//                     INSERT INTO DoctorLocations (DoctorId, ClinicName, Address, City, State, Pincode, IsPrimary, IsActive)
//                     VALUES (@DoctorId, @ClinicName, @Address, @City, @State, @Pincode, @IsPrimary, 1)
//                 `);
//         }

//         // 4. Insert Professional Details / Bio (If provided)
//         if (professional) {
//             const profReq = new sql.Request(transaction);
//             await profReq
//                 .input('DoctorId', sql.Int, newDoctorId)
//                 .input('Bio', sql.NVarChar, professional.bio || null)
//                 .input('LanguagesSpoken', sql.NVarChar, professional.languagesSpoken || null)
//                 .input('SubSpecialization', sql.NVarChar, professional.subSpecialization || null)
//                 .query(`
//                     INSERT INTO DoctorProfessionalDetails (DoctorId, Bio, LanguagesSpoken, SubSpecialization)
//                     VALUES (@DoctorId, @Bio, @LanguagesSpoken, @SubSpecialization)
//                 `);
//         }

//         // 5. Insert Documents (If array is provided)
//         if (documents && Array.isArray(documents) && documents.length > 0) {
//             for (const doc of documents) {
//                 if (doc.documentType && doc.documentUrl) {
//                     const docReq = new sql.Request(transaction);
//                     await docReq
//                         .input('DoctorId', sql.Int, newDoctorId)
//                         .input('DocumentType', sql.VarChar, doc.documentType)
//                         .input('DocumentUrl', sql.NVarChar, doc.documentUrl)
//                         .query(`
//                             INSERT INTO DoctorDocuments (DoctorId, DocumentType, DocumentUrl)
//                             VALUES (@DoctorId, @DocumentType, @DocumentUrl)
//                         `);
//                 }
//             }
//         }

//         // Commit transaction if all inserts succeed
//         await transaction.commit();

//         return res.status(201).json({ 
//             success: true, 
//             message: "Complete Doctor profile created successfully.", 
//             data: { doctorId: newDoctorId } 
//         });

//     } catch (error) {
//         // Rollback everything if any single query fails
//         if (transaction) await transaction.rollback();
//         console.error("Error in createDoctorFullProfile:", error);
//         return res.status(200).json({ success: false, message: "Server Error during profile creation", error: error.message });
//     }
// };

// /**
//  * @function updateDoctorFullProfile
//  * @description Master API: Updates any part of the doctor's profile in a single request.
//  * @route PUT /api/doctors/:id
//  * @access Private (Admin Only)
//  */
// const updateDoctorFullProfile = async (req, res) => {
//     try {
//         const doctorId = req.params.id;
//         const { 
//             fullName, consultationFee, followupFee, experienceYears, phone, email, specializationId,
//             professional, location 
//         } = req.body;

//         const pool = await connectDB();

//         // 1. Update Main Doctor Details
//         await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .input('FullName', sql.NVarChar, fullName)
//             .input('SpecializationId', sql.Int, specializationId)
//             .input('ConsultationFee', sql.Decimal(10, 2), consultationFee)
//             .input('FollowupFee', sql.Decimal(10, 2), followupFee)
//             .input('ExperienceYears', sql.Int, experienceYears)
//             .input('Phone', sql.VarChar, phone)
//             .input('Email', sql.NVarChar, email)
//             .query(`
//                 UPDATE Doctors 
//                 SET 
//                     FullName = ISNULL(@FullName, FullName),
//                     SpecializationId = ISNULL(@SpecializationId, SpecializationId),
//                     ConsultationFee = ISNULL(@ConsultationFee, ConsultationFee),
//                     FollowupFee = ISNULL(@FollowupFee, FollowupFee),
//                     ExperienceYears = ISNULL(@ExperienceYears, ExperienceYears),
//                     Phone = ISNULL(@Phone, Phone),
//                     Email = ISNULL(@Email, Email)
//                 WHERE DoctorId = @DoctorId
//             `);
//     // 2. Update Professional Details (UPSERT: Update if exists, else Insert)
//         if (professional) {
//             await pool.request()
//                 .input('DoctorId', sql.Int, doctorId)
//                 .input('Bio', sql.NVarChar, professional.bio)
//                 .input('LanguagesSpoken', sql.NVarChar, professional.languagesSpoken)
//                 .input('SubSpecialization', sql.NVarChar, professional.subSpecialization)
//                 .query(`
//                     IF EXISTS (SELECT 1 FROM DoctorProfessionalDetails WHERE DoctorId = @DoctorId)
//                         UPDATE DoctorProfessionalDetails 
//                         SET Bio = ISNULL(@Bio, Bio), LanguagesSpoken = ISNULL(@LanguagesSpoken, LanguagesSpoken), SubSpecialization = ISNULL(@SubSpecialization, SubSpecialization)
//                         WHERE DoctorId = @DoctorId
//                     ELSE
//                         INSERT INTO DoctorProfessionalDetails (DoctorId, Bio, LanguagesSpoken, SubSpecialization)
//                         VALUES (@DoctorId, @Bio, @LanguagesSpoken, @SubSpecialization)
//                 `);
//         }

//         // 3. Update Primary Location
//         if (location) {
//             await pool.request()
//                 .input('DoctorId', sql.Int, doctorId)
//                 .input('ClinicName', sql.NVarChar, location.clinicName)
//                 .input('Address', sql.NVarChar, location.address)
//                 .input('City', sql.NVarChar, location.city)
//                 .input('State', sql.NVarChar, location.state)
//                 .input('Pincode', sql.VarChar, location.pincode)
//                 .query(`
//                     IF EXISTS (SELECT 1 FROM DoctorLocations WHERE DoctorId = @DoctorId AND IsPrimary = 1)
//                         UPDATE DoctorLocations 
//                         SET ClinicName = ISNULL(@ClinicName, ClinicName), Address = ISNULL(@Address, Address), 
//                             City = ISNULL(@City, City), State = ISNULL(@State, State), Pincode = ISNULL(@Pincode, Pincode)
//                         WHERE DoctorId = @DoctorId AND IsPrimary = 1
//                     ELSE
//                         INSERT INTO DoctorLocations (DoctorId, ClinicName, Address, City, State, Pincode, IsPrimary, IsActive)
//                         VALUES (@DoctorId, @ClinicName, @Address, @City, @State, @Pincode, 1, 1)
//                 `);
//         }

//         return res.status(200).json({ success: true, message: "Doctor profile updated successfully." });
//     } catch (error) {
//         console.error("Error in updateDoctorFullProfile:", error);
//         return res.status(200).json({ success: false, message: "Server Error", error: error.message });
//     }
// };

// /**
//  * @function deleteDoctor 
//  * @description Admin deactivates a doctor (Soft Delete - Does not delete record from DB).
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

// /**
//  * @function getDoctorsForPatientDashboard
//  * @description Dedicated API for the Patient Mobile App. Returns a rich, formatted 
//  *              catalog of active doctors including profile images, ratings, bio, and languages.
//  * @route GET /api/doctors/dashboard-list
//  * @access Public (Patients)
//  */
// const getDoctorsForPatientDashboard = async (req, res) => {
//     try {
//         const pool = await connectDB();
        
//         // 1. Core Query: Joins Doctors with Specializations and Professional Details
//         const result = await pool.request().query(`
//             SELECT 
//                 d.DoctorId, 
//                 d.FullName, 
//                 d.ExperienceYears, 
//                 d.ConsultationFee, 
//                 d.ProfileImageUrl, 
//                 d.Rating,
//                 s.Name AS SpecializationName,
//                 dp.Bio,
//                 dp.LanguagesSpoken
//             FROM Doctors d
//             LEFT JOIN Specializations s ON d.SpecializationId = s.SpecializationId
//             LEFT JOIN DoctorProfessionalDetails dp ON d.DoctorId = dp.DoctorId
//             WHERE d.IsActive = 1
//         `);

//         // 2. Data Formatting for Frontend UI
//         const formattedDoctors = result.recordset.map(doc => {
            
//             // Safely handle Languages (parsing stringified JSON if it exists)
//             let parsedLanguages = ["English", "Hindi"]; // Default fallback
//             if (doc.LanguagesSpoken) {
//                 try {
//                     // Try to parse if it's a JSON string like '["English", "Hindi"]'
//                     parsedLanguages = JSON.parse(doc.LanguagesSpoken);
//                 } catch (e) {
//                     // If it's just raw text like "Native" (as seen in your DB image), put it in an array
//                     parsedLanguages = [doc.LanguagesSpoken]; 
//                 }
//             }

//             return {
//                 id: doc.DoctorId,
//                 // Automatically prepend 'Dr.' if admin forgot to add it
//                 fullName: doc.FullName.startsWith('Dr.') ? doc.FullName : `Dr. ${doc.FullName}`,
                
//                 // Fallback image prevents frontend crashes if admin hasn't uploaded a photo yet
//                 photoUrl: doc.ProfileImageUrl || "https://dummyimage.com/300x300/e0e0e0/000000.png&text=Doctor", 
                
//                 rating: doc.Rating || 4.5,
//                 consultationFee: doc.ConsultationFee,
                
//                 // Nested object specifically requested by mobile developers for clean UI binding
//                 professionalDetails: {
//                     specialization: doc.SpecializationName || "General Physician",
//                     experience: doc.ExperienceYears ? `${doc.ExperienceYears}+ Years Exp.` : "Experienced",
//                     languages: parsedLanguages,
//                     about: doc.Bio || "Dedicated healthcare professional committed to patient well-being."
//                 }
//             };
//         });

//         // 3. Return the formatted response
//         return res.status(200).json({ 
//             success: true, 
//             message: "Doctor catalog for patient dashboard fetched successfully.",
//             data: formattedDoctors 
//         });

//     } catch (error) {
//         console.error("[Doctor Controller] Patient Dashboard Error:", error);
//         // Using 500 for actual server crashes instead of 200
//         return res.status(500).json({ success: false, message: "Server Error", error: error.message });
//     }
// };






// module.exports = {
//     createDoctorFullProfile,
//     updateDoctorFullProfile,
//     deleteDoctor,
//     getDoctorList,
//     getDoctorFullProfile,
//     getDoctorsForPatientDashboard
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
            profileImageUrl, qualifications, rating,
            registration, location, professional, documents 
        } = req.body;

        // 1. Strictly require Phone number for Auto-Linking logic
        const cleanPhone = phone ? phone.trim() : null;
        if (!fullName || !specializationId || !cleanPhone) {
            return res.status(400).json({ success: false, message: "Missing required fields: fullName, specializationId, or phone (Required for login linkage)" });
        }

        pool = await connectDB();
        
        // 2. [FIX] Prevent Duplicate Doctors with the same phone number
        const checkExistingPhone = await pool.request()
            .input('Phone', sql.VarChar, cleanPhone)
            .query('SELECT DoctorId FROM Doctors WHERE Phone = @Phone');

        if (checkExistingPhone.recordset.length > 0) {
            return res.status(400).json({ success: false, message: "A Doctor profile with this phone number already exists! Cannot create duplicate." });
        }

        // 3. [SMART LINK] Check if this phone number already exists in 'users' table 
        // (i.e., Doctor already downloaded the app and logged in as a patient previously)
        let finalUserId = userId || null; 
        const checkUser = await pool.request()
            .input('Mobile', sql.VarChar, cleanPhone)
            .query('SELECT UserId FROM users WHERE mobile = @Mobile');
        
        if (checkUser.recordset.length > 0) {
            finalUserId = checkUser.recordset[0].UserId; // Grab the existing User ID
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
        request.input('Phone', sql.VarChar, cleanPhone); // Using cleaned phone
        request.input('UserId', sql.Int, finalUserId);   // Using smartly detected UserId
        request.input('ProfileImageUrl', sql.NVarChar, profileImageUrl || null);
        request.input('Qualifications', sql.NVarChar, qualifications || null);
        request.input('Rating', sql.Decimal(2, 1), rating || 4.5);
        
        const docResult = await request.query(`
            INSERT INTO Doctors (FullName, SpecializationId, ExperienceYears, ConsultationFee, FollowupFee, Email, Phone, UserId, ProfileImageUrl, Qualifications, Rating, IsActive) 
            OUTPUT INSERTED.DoctorId 
            VALUES (@FullName, @SpecializationId, @ExperienceYears, @ConsultationFee, @FollowupFee, @Email, @Phone, @UserId, @ProfileImageUrl, @Qualifications, @Rating, 1)
        `);
        
        const newDoctorId = docResult.recordset[0].DoctorId;

        // [FIX] If we found an existing User account for this doctor, upgrade them to 'DOCTOR' instantly
        if (finalUserId) {
            const userUpgradeReq = new sql.Request(transaction);
            await userUpgradeReq
                .input('UserId', sql.Int, finalUserId)
                .query(`UPDATE users SET Role = 'DOCTOR', onboardingcompleted = 1 WHERE UserId = @UserId`);
            console.log(`[SYSTEM] Pre-existing User ${finalUserId} upgraded to DOCTOR role instantly via Admin Panel.`);
        }

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
        return res.status(500).json({ success: false, message: "Server Error during profile creation", error: error.message });
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
            profileImageUrl, qualifications, rating, // <-- Added new fields
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
            .input('Email', sql.NVarChar, email?.trim() || null)
            .input('ProfileImageUrl', sql.NVarChar, profileImageUrl)
            .input('Qualifications', sql.NVarChar, qualifications)
            .input('Rating', sql.Decimal(2, 1), rating)
            .query(`
                UPDATE Doctors 
                SET 
                    FullName = ISNULL(@FullName, FullName),
                    SpecializationId = ISNULL(@SpecializationId, SpecializationId),
                    ConsultationFee = ISNULL(@ConsultationFee, ConsultationFee),
                    FollowupFee = ISNULL(@FollowupFee, FollowupFee),
                    ExperienceYears = ISNULL(@ExperienceYears, ExperienceYears),
                    Phone = ISNULL(@Phone, Phone),
                    Email = ISNULL(@Email, Email),
                    ProfileImageUrl = ISNULL(@ProfileImageUrl, ProfileImageUrl),
                    Qualifications = ISNULL(@Qualifications, Qualifications),
                    Rating = ISNULL(@Rating, Rating)
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
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
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
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
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
            SELECT d.DoctorId, d.FullName, d.ExperienceYears, d.ConsultationFee, 
                   d.ProfileImageUrl, d.Qualifications, d.Rating, -- <-- Added new fields
                   s.Name AS Specialization 
            FROM Doctors d
            JOIN Specializations s ON d.SpecializationId = s.SpecializationId
            WHERE d.IsActive = 1
        `);

        return res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function getDoctorFullProfile
 * @description Public API to view complete doctor details including locations and bio.
 * @route GET /api/doctors/:id
 * @access Public (Patients & Everyone)
 */
const getDoctorFullProfile = async (req, res) => {
    console.log("🚨 CHECKING ROUTE COLLISION - ID : ", req.params.id);
    try {
        const doctorId = req.params.id;
        const pool = await connectDB();
        
        // 1. Get Basic Profile
        const profile = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
            SELECT d.DoctorId, d.FullName, d.ExperienceYears, d.ConsultationFee, d.FollowupFee, d.IsActive, 
                   d.ProfileImageUrl, d.Qualifications, d.Rating, -- <-- Added new fields
                   s.Name AS Specialization 
            FROM Doctors d JOIN Specializations s ON d.SpecializationId = s.SpecializationId WHERE d.DoctorId = @DoctorId
        `);

        if (profile.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
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
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function getDoctorsForPatientDashboard
 * @description Dedicated API for the Patient Mobile App. Returns a rich, formatted 
 *              catalog of active doctors including profile images, ratings, bio, and languages.
 * @route GET /api/doctors/dashboard-list
 * @access Public (Patients)
 */
const getDoctorsForPatientDashboard = async (req, res) => {
    try {
        const pool = await connectDB();
        
        // 1. Core Query: Joins Doctors with Specializations and Professional Details
        const result = await pool.request().query(`
            SELECT 
                d.DoctorId, 
                d.FullName, 
                d.ExperienceYears, 
                d.ConsultationFee, 
                d.ProfileImageUrl, 
                d.Qualifications, -- <-- Added new field
                d.Rating,
                s.Name AS SpecializationName,
                dp.Bio,
                dp.LanguagesSpoken
            FROM Doctors d
            LEFT JOIN Specializations s ON d.SpecializationId = s.SpecializationId
            LEFT JOIN DoctorProfessionalDetails dp ON d.DoctorId = dp.DoctorId
            WHERE d.IsActive = 1
        `);

        // 2. Data Formatting for Frontend UI
        const formattedDoctors = result.recordset.map(doc => {
            
            // Safely handle Languages (parsing stringified JSON if it exists)
            let parsedLanguages = ["English", "Hindi"]; // Default fallback
            if (doc.LanguagesSpoken) {
                try {
                    // Try to parse if it's a JSON string like '["English", "Hindi"]'
                    parsedLanguages = JSON.parse(doc.LanguagesSpoken);
                } catch (e) {
                    // If it's just raw text like "Native", put it in an array
                    parsedLanguages = [doc.LanguagesSpoken]; 
                }
            }

            return {
                id: doc.DoctorId,
                fullName: doc.FullName.startsWith('Dr.') ? doc.FullName : `Dr. ${doc.FullName}`,
                photoUrl: doc.ProfileImageUrl || "https://dummyimage.com/300x300/e0e0e0/000000.png&text=Doctor", 
                rating: doc.Rating || 4.5,
                consultationFee: doc.ConsultationFee,
                
                // Nested object specifically requested by mobile developers for clean UI binding
                professionalDetails: {
                    specialization: doc.SpecializationName || "General Physician",
                    qualifications: doc.Qualifications || "MBBS, MD", // <-- Handled in JSON
                    experience: doc.ExperienceYears ? `${doc.ExperienceYears}+ Years Exp.` : "Experienced",
                    languages: parsedLanguages,
                    about: doc.Bio || "Dedicated healthcare professional committed to patient well-being."
                }
            };
        });

        // 3. Return the formatted response
        return res.status(200).json({ 
            success: true, 
            message: "Doctor catalog for patient dashboard fetched successfully.",
            data: formattedDoctors 
        });

    } catch (error) {
        console.error("[Doctor Controller] Patient Dashboard Error:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function getDoctorDashboardStats
 * @description Aggregates core metrics for the Doctor's home screen (Today's queue, Premium retention, etc.)
 * @route GET /api/appointments/doctor/dashboard-stats
 * @access Private (Doctor Only)
 */
const getDoctorDashboardStats = async (req, res) => {
    console.log("Galti se isme aa gaya, ID hai: ", req.params.id);
    try {
        const userId = req.user.userId; 
        const pool = await connectDB();

        const docCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .query('SELECT DoctorId FROM Doctors WHERE UserId = @UserId');

        if (docCheck.recordset.length === 0) {
            return res.status(403).json({ success: false, message: "Access denied. Doctor profile not found." });
        }
        const doctorId = docCheck.recordset[0].DoctorId;

        // Execute multiple lightning-fast aggregation queries concurrently
        const result = await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .query(`
                -- 1. Today's Total Appointments
                SELECT COUNT(*) AS TodayAppointments 
                FROM Appointments a 
                JOIN DoctorSlots s ON a.SlotId = s.SlotId 
                WHERE a.DoctorId = @DoctorId 
                  AND s.SlotDate = CAST(GETDATE() AS DATE) 
                  AND a.Status = 'Booked';

                -- 2. Total Premium Patients (Long-term care plan users locked to this doctor)
                SELECT COUNT(*) AS TotalPremiumPatients 
                FROM users 
                WHERE DefaultDoctorId = @DoctorId;

                -- 3. Total Consultations Completed All-Time
                SELECT COUNT(*) AS LifetimeConsultations 
                FROM Appointments 
                WHERE DoctorId = @DoctorId AND Status = 'Completed';
            `);

        // SQL Server returns multiple recordsets when executing multiple SELECTs
        const dashboardStats = {
            todayAppointments: result.recordsets[0][0].TodayAppointments || 0,
            totalPremiumPatients: result.recordsets[1][0].TotalPremiumPatients || 0,
            lifetimeConsultations: result.recordsets[2][0].LifetimeConsultations || 0
        };

        return res.status(200).json({ 
            success: true, 
            message: "Dashboard metrics fetched successfully.", 
            data: dashboardStats 
        });

    } catch (error) {
        console.error("Doctor Dashboard Stats Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};


/**
 * @function getMyDoctorProfile
 * @description Logged-in doctor gets their own complete profile based on their Auth Token.
 * @route GET /api/doctors/my-profile
 * @access Private (Doctor Only)
 */
const getMyDoctorProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // Auth token se aayega
        const pool = await connectDB();

        // 1. Find the DoctorId associated with this logged-in UserId
        const docCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .query('SELECT DoctorId FROM Doctors WHERE UserId = @UserId');

        if (docCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Doctor profile not found for this user account." });
        }
        
        const doctorId = docCheck.recordset[0].DoctorId;

        // 2. Get Basic Profile
        const profile = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
            SELECT d.DoctorId, d.FullName, d.ExperienceYears, d.ConsultationFee, d.FollowupFee, d.IsActive, 
                   d.ProfileImageUrl, d.Qualifications, d.Rating, 
                   s.Name AS Specialization 
            FROM Doctors d 
            JOIN Specializations s ON d.SpecializationId = s.SpecializationId 
            WHERE d.DoctorId = @DoctorId
        `);

        // 3. Get Professional Details
        const details = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
            SELECT Bio, LanguagesSpoken, SubSpecialization FROM DoctorProfessionalDetails WHERE DoctorId = @DoctorId
        `);

        // 4. Get Locations
        const locations = await pool.request().input('DoctorId', sql.Int, doctorId).query(`
            SELECT ClinicName, Address, City, State, Pincode, IsPrimary 
            FROM DoctorLocations 
            WHERE DoctorId = @DoctorId AND IsActive = 1
        `);

        const finalData = {
            ...profile.recordset[0],
            professionalDetails: details.recordset.length > 0 ? details.recordset[0] : null,
            clinics: locations.recordset
        };

        return res.status(200).json({ success: true, data: finalData, message: "My profile fetched successfully." });
    } catch (error) {
        console.error("[Doctor Profile] Get My Profile Error:", error);
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};



module.exports = {
    createDoctorFullProfile,
    updateDoctorFullProfile,
    deleteDoctor,
    getDoctorList,
    getDoctorFullProfile,
    getDoctorsForPatientDashboard,
    getDoctorDashboardStats,
    getMyDoctorProfile
};

