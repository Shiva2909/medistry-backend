// const { connectDB, sql } = require('../db');
// // 1. IMPORTANT: Import the 100ms service here
// const { generateVideoRoomAndCodes } = require('../utils/hmsService');

// /**
//  * @function addMasterSchedule
//  * @description Admin/Doctor adds a weekly working shift (e.g., Monday 10:00 to 14:00)
//  * @route POST /api/schedule/master
//  * @access Private (Admin/Doctor)
//  */
// const addMasterSchedule = async (req, res) => {
//     try {
//         const { doctorId, schedules } = req.body;

//         if (!doctorId || !schedules || !Array.isArray(schedules) || schedules.length === 0) {
//             return res.status(400).json({ success: false, message: "DoctorId and an array of schedules are required." });
//         }

//         const pool = await connectDB();
//         let insertedCount = 0;

//         for (let schedule of schedules) {
//             const { dayOfWeek, startTime, endTime } = schedule;

//             if (!dayOfWeek || !startTime || !endTime) continue; 

//             await pool.request()
//                 .input('DoctorId', sql.Int, doctorId)
//                 .input('DayOfWeek', sql.NVarChar, dayOfWeek)
//                 .input('StartTime', sql.VarChar, startTime) 
//                 .input('EndTime', sql.VarChar, endTime)
//                 .query(`
//                     INSERT INTO DoctorMasterSchedules (DoctorId, DayOfWeek, StartTime, EndTime, SlotDuration, IsActive)
//                     VALUES (@DoctorId, @DayOfWeek, @StartTime, @EndTime, 30, 1)
//                 `);
            
//             insertedCount++;
//         }

//         return res.status(201).json({ success: true, message: `Successfully added ${insertedCount} schedule(s) for the doctor.` });
//     } catch (error) {
//         console.error("[Schedule Engine] Add Master Schedule Error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };

// /**
//  * @function addLeave
//  * @description Admin/Doctor blocks a specific date/time for leave
//  * @route POST /api/schedule/leave
//  * @access Private (Admin/Doctor)
//  */
// const addLeave = async (req, res) => {
//     try {
//         const { doctorId, leaveDate, startTime, endTime, reason } = req.body;

//         if (!doctorId || !leaveDate) {
//             return res.status(400).json({ success: false, message: "DoctorId and LeaveDate are required." });
//         }

//         const pool = await connectDB();
//         await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .input('LeaveDate', sql.Date, leaveDate)
//             .input('StartTime', sql.VarChar, startTime || null)
//             .input('EndTime', sql.VarChar, endTime || null)
//             .input('Reason', sql.NVarChar, reason || null)
//             .query(`
//                 INSERT INTO DoctorLeaves (DoctorId, LeaveDate, StartTime, EndTime, Reason, IsActive)
//                 VALUES (@DoctorId, @LeaveDate, @StartTime, @EndTime, @Reason, 1)
//             `);

//         return res.status(201).json({ success: true, message: "Leave added successfully." });
//     } catch (error) {
//         console.error("[Schedule Engine] Add Leave Error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };

// /**
//  * @function generateDailySlots
//  * @description ENGINE: Handles Full/Partial Leaves & UTC Timezone to generate safe slots
//  * @route POST /api/schedule/generate
//  * @access Private (Admin/Doctor)
//  */
// const generateDailySlots = async (req, res) => {
//     try {
//         const { doctorId, targetDate } = req.body; 

//         const pool = await connectDB();

//         // TIMEZONE FIX: Strictly forcing UTC so the day doesn't shift
//         const dateObj = new Date(targetDate); 

//         // Extract accurate day of the week based on Indian Standard Time context
//         const dayOfWeek = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
        
//         // Fetch all leaves for this doctor on this date
//         const leaveCheck = await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .input('LeaveDate', sql.VarChar, targetDate)
//             .query(`
//                 SELECT 
//                     CONVERT(varchar(8), StartTime, 108) AS StartTime, 
//                     CONVERT(varchar(8), EndTime, 108) AS EndTime 
//                 FROM DoctorLeaves 
//                 WHERE DoctorId = @DoctorId AND LeaveDate = @LeaveDate AND IsActive = 1
//             `);
//         const leaves = leaveCheck.recordset;

//         // Check if there is a full-day leave
//         const hasFullDayLeave = leaves.some(leave => leave.StartTime === null);
//         if (hasFullDayLeave) {
//             return res.status(200).json({ success: true, message: "Doctor is on full-day leave. No slots generated." });
//         }

//         // Get Master Schedule for this day
//         const schedule = await pool.request()
//             .input('DoctorId', sql.Int, doctorId)
//             .input('DayOfWeek', sql.NVarChar, dayOfWeek)
//             .query(`
//                 SELECT 
//                     CONVERT(varchar(8), StartTime, 108) AS StartTime, 
//                     CONVERT(varchar(8), EndTime, 108) AS EndTime 
//                 FROM DoctorMasterSchedules 
//                 WHERE DoctorId = @DoctorId AND DayOfWeek = @DayOfWeek AND IsActive = 1
//             `);

//         if (schedule.recordset.length === 0) {
//             return res.status(200).json({ success: true, message: "Doctor does not work on this day." });
//         }

//         // Time Calculation & PARTIAL LEAVE LOGIC
//         let generatedCount = 0;
//         for (let shift of schedule.recordset) {
//             let current = new Date(`${targetDate}T${shift.StartTime}Z`);
//             let end = new Date(`${targetDate}T${shift.EndTime}Z`);

//             while (current < end) {
//                 let slotStart = current.toISOString().substring(11, 19); 
//                 current.setMinutes(current.getMinutes() + 30); 
//                 let slotEnd = current.toISOString().substring(11, 19);

//                 // Check if this slot overlaps with any partial leave
//                 let isSlotBlockedByLeave = false;
//                 for (let leave of leaves) {
//                     if (slotStart < leave.EndTime && slotEnd > leave.StartTime) {
//                         isSlotBlockedByLeave = true;
//                         break;
//                     }
//                 }

//                 // Insert into DB only if it doesn't overlap with a leave
//                 if (!isSlotBlockedByLeave) {
//                     await pool.request()
//                         .input('DoctorId', sql.Int, doctorId)
//                         .input('SlotDate', sql.VarChar, targetDate)
//                         .input('StartTime', sql.VarChar, slotStart)
//                         .input('EndTime', sql.VarChar, slotEnd)
//                         .query(`
//                             IF NOT EXISTS (SELECT 1 FROM DoctorSlots WHERE DoctorId = @DoctorId AND SlotDate = @SlotDate AND StartTime = @StartTime)
//                             BEGIN
//                                 INSERT INTO DoctorSlots (DoctorId, SlotDate, StartTime, EndTime, Status)
//                                 VALUES (@DoctorId, @SlotDate, @StartTime, @EndTime, 'Available')
//                             END
//                         `);
//                     generatedCount++;
//                 }
//             }
//         }

//         return res.status(201).json({ success: true, message: `${generatedCount} slots generated for ${targetDate}.` });
//     } catch (error) {
//         console.error("[Schedule Engine] Generate Slots Error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };

// /**
//  * @function getAvailableSlots
//  * @description Smart Engine: Returns available slots. 
//  *              If the patient has a default doctor, shows only their personalized slots.
//  *              Otherwise, shows all available slots across the platform blindly.
//  * @route GET /api/schedule/slots/:date
//  * @access Protected (Patient)
//  */
// const getAvailableSlots = async (req, res) => {
//     try {
//         const { date } = req.params;
//         const patientId = req.user.userId;

//         const pool = await connectDB();

//         // 1. Check if the patient has a default doctor mapped (from a previous package purchase)
//         const checkUser = await pool.request()
//             .input('UserId', sql.Int, patientId)
//             .query(`SELECT DefaultDoctorId FROM users WHERE UserId = @UserId`);
        
//         const defaultDoctorId = checkUser.recordset.length > 0 ? checkUser.recordset[0].DefaultDoctorId : null;

//         let slotsResult;

//         if (defaultDoctorId) {
//             // SCENARIO A: Patient is locked to a specific doctor (Package Holder)
//             // Only show slots for their assigned default doctor.
//             slotsResult = await pool.request()
//                 .input('DoctorId', sql.Int, defaultDoctorId)
//                 .input('SlotDate', sql.Date, date)
//                 .query(`
//                     SELECT 
//                         SlotId, 
//                         CONVERT(varchar(8), StartTime, 108) AS StartTime, 
//                         CONVERT(varchar(8), EndTime, 108) AS EndTime, 
//                         Status 
//                     FROM DoctorSlots 
//                     WHERE DoctorId = @DoctorId AND SlotDate = @SlotDate AND Status = 'Available'
//                     ORDER BY StartTime ASC
//                 `);
//         } else {
//             // SCENARIO B: New Patient (Blind Booking)
//             // Show available times across the platform. Group by time to avoid duplicates.
//             // MIN(SlotId) securely assigns one available doctor's slot randomly under the hood.
//             slotsResult = await pool.request()
//                 .input('SlotDate', sql.Date, date)
//                 .query(`
//                     SELECT 
//                         MIN(SlotId) AS SlotId, 
//                         CONVERT(varchar(8), StartTime, 108) AS StartTime, 
//                         CONVERT(varchar(8), EndTime, 108) AS EndTime, 
//                         'Available' AS Status
//                     FROM DoctorSlots
//                     WHERE SlotDate = @SlotDate AND Status = 'Available'
//                     GROUP BY StartTime, EndTime
//                     ORDER BY StartTime ASC
//                 `);
//         }

//         return res.status(200).json({ 
//             success: true, 
//             message: defaultDoctorId ? "Fetched personalized slots for your assigned doctor." : "Fetched platform available slots.",
//             data: slotsResult.recordset 
//         });
//     } catch (error) {
//         console.error("[Slot Engine Error]:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };

// /**
//  * @function bookSlot
//  * @description Securely locks slot, creates Appointment, auto-generates 100ms Video Room, 
//  *              and consumes the Nano Package / links the valid blood report.
//  * @route PUT /api/schedule/book
//  * @access Protected (Patient - Validated by Gatekeeper)
//  */
// const bookSlot = async (req, res) => {
//     try {
//         const patientId = req.user.userId; 
//         const { slotId, consultationType, reason } = req.body;
        
//         // Extracted securely from our checkActiveSubscription middleware
//         const bookingType = req.bookingType; 
//         const validReportId = req.validReportId || null;
//         const validLabBookingId = req.validLabBookingId || null;

//         if (!slotId) {
//             return res.status(400).json({ success: false, message: "SlotId is required to book an appointment." });
//         }

//         const pool = await connectDB();
        
//         // We use a robust SQL Transaction to ensure Slot Locking, Appointment Creation, 
//         // and Package Consumption happen simultaneously or not at all.
//         const result = await pool.request()
//             .input('SlotId', sql.Int, slotId)
//             .input('UserId', sql.Int, patientId)
//             .input('ConsultationType', sql.NVarChar, consultationType || 'Video')
//             .input('Reason', sql.NVarChar, reason || null)
//             .input('ReportId', sql.Int, validReportId)
//             .input('BookingType', sql.VarChar, bookingType)
//             .query(`
//                 BEGIN TRAN;
//                 DECLARE @DocId INT;
//                 DECLARE @NewAppId INT;

//                 -- Check if slot is available and strictly lock the row
//                 SELECT @DocId = DoctorId FROM DoctorSlots WITH (UPDLOCK) 
//                 WHERE SlotId = @SlotId AND Status = 'Available';

//                 IF @DocId IS NOT NULL
//                 BEGIN
//                     -- 1. Mark the slot as Completed AND assign the PatientId
//                     UPDATE DoctorSlots 
//                     SET Status = 'Completed', PatientId = @UserId 
//                     WHERE SlotId = @SlotId;

//                     -- 2. Create the official receipt in Appointments table
//                     INSERT INTO Appointments (SlotId, DoctorId, UserId, ConsultationType, Reason, Status)
//                     VALUES (@SlotId, @DocId, @UserId, @ConsultationType, @Reason, 'Booked');

//                     -- Capture the ID of the newly inserted Appointment
//                     SET @NewAppId = SCOPE_IDENTITY();

//                     -- 3. CONSUME NANO PACKAGE & LINK REPORT (If not a long-term Care Plan)
//                     IF @BookingType = 'NANO_UPLOADED' OR @BookingType = 'NANO_LAB'
//                     BEGIN
//                         -- Mark Nano Package as consumed
//                         UPDATE UserSubscriptions 
//                         SET Status = 'Consumed' 
//                         WHERE UserId = @UserId AND PlanID = 'NANO_PACKAGE' AND Status = 'Active';

//                         -- Link the new appointment ID to the uploaded report (to prevent reuse)
//                         IF @BookingType = 'NANO_UPLOADED' AND @ReportId IS NOT NULL
//                         BEGIN
//                             UPDATE PatientReports 
//                             SET AppointmentId = @NewAppId 
//                             WHERE ReportId = @ReportId;
//                         END
//                     END

//                     COMMIT TRAN;
//                     SELECT 1 AS Success, @NewAppId AS AppointmentId;
//                 END
//                 ELSE
//                 BEGIN
//                     ROLLBACK TRAN;
//                     SELECT 0 AS Success, NULL AS AppointmentId;
//                 END
//             `);

//         if (result.recordset[0].Success === 0) {
//             return res.status(400).json({ success: false, message: "Sorry, this slot was just booked by someone else or is unavailable." });
//         }

//         const newAppointmentId = result.recordset[0].AppointmentId;

//         // 4. 100MS INTEGRATION (Wrapped in try-catch to prevent booking failure if video server glitches)
//         try {
//             const videoDetails = await generateVideoRoomAndCodes(newAppointmentId);

//             await pool.request()
//                 .input('AppointmentId', sql.Int, newAppointmentId)
//                 .input('VideoRoomId', sql.NVarChar, videoDetails.roomId)
//                 .input('PatientRoomCode', sql.NVarChar, videoDetails.patientCode)
//                 .input('DoctorRoomCode', sql.NVarChar, videoDetails.doctorCode)
//                 .input('PatientJoinLink', sql.NVarChar, videoDetails.patientLink)
//                 .input('DoctorJoinLink', sql.NVarChar, videoDetails.doctorLink)
//                 .query(`
//                     UPDATE Appointments 
//                     SET VideoRoomId = @VideoRoomId, 
//                         PatientRoomCode = @PatientRoomCode, 
//                         DoctorRoomCode = @DoctorRoomCode,
//                         PatientJoinLink = @PatientJoinLink,
//                         DoctorJoinLink = @DoctorJoinLink
//                     WHERE AppointmentId = @AppointmentId
//                 `);
                
//             console.log(`[100ms] Successfully attached secure video room for Appointment: ${newAppointmentId}`);
//         } catch (videoError) {
//             console.error("[100ms Booking Error] Video room creation failed but slot is secured:", videoError.message);
//         }

//         return res.status(200).json({ 
//             success: true, 
//             message: "Appointment successfully booked! The video link has been generated.",
//             data: { appointmentId: newAppointmentId }
//         });
//     } catch (error) {
//         console.error("[Schedule Engine] Booking Error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };

// /**
//  * @function cancelAppointment
//  * @description Patient cancels their appointment, freeing the slot AND updating Appointment history
//  * @route PUT /api/schedule/cancel
//  * @access Protected (Patient)
//  */
// const cancelAppointment = async (req, res) => {
//     try {
//         const patientId = req.user.userId;
//         const { slotId } = req.body; 

//         if (!slotId) {
//             return res.status(400).json({ success: false, message: "SlotId is required to cancel." });
//         }

//         const pool = await connectDB();
        
//         const result = await pool.request()
//             .input('SlotId', sql.Int, slotId)
//             .input('UserId', sql.Int, patientId)
//             .query(`
//                 BEGIN TRAN;
//                 DECLARE @AppId INT;

//                 SELECT @AppId = AppointmentId 
//                 FROM Appointments WITH (UPDLOCK)
//                 WHERE SlotId = @SlotId AND UserId = @UserId AND Status = 'Booked';

//                 IF @AppId IS NOT NULL
//                 BEGIN
//                     UPDATE Appointments 
//                     SET Status = 'Cancelled', CancelledAt = SYSDATETIME() 
//                     WHERE AppointmentId = @AppId;

//                     UPDATE DoctorSlots 
//                     SET Status = 'Available' 
//                     WHERE SlotId = @SlotId;

//                     -- Note: Optionally handle reverting 'Consumed' Nano Packages here if your business logic requires it

//                     COMMIT;
//                     SELECT 1 AS Success;
//                 END
//                 ELSE
//                 BEGIN
//                     ROLLBACK;
//                     SELECT 0 AS Success;
//                 END
//             `);

//         if (result.recordset[0].Success === 0) {
//             return res.status(400).json({ success: false, message: "Invalid request. Appointment not found or already cancelled." });
//         }

//         return res.status(200).json({ success: true, message: "Appointment cancelled successfully. The slot is open again." });
//     } catch (error) {
//         console.error("[Schedule Engine] Cancel Appointment Error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };

// module.exports = {
//     addMasterSchedule,
//     addLeave,
//     generateDailySlots,
//     getAvailableSlots,
//     bookSlot,
//     cancelAppointment  
// };
const { connectDB, sql } = require('../db');
// 1. IMPORTANT: Import the 100ms service here
const { generateVideoRoomAndCodes } = require('../utils/hmsService');

/**
 * @function addMasterSchedule
 * @description Admin/Doctor adds a weekly working shift (e.g., Monday 10:00 to 14:00)
 * @route POST /api/schedule/master
 * @access Private (Admin/Doctor)
 */
const addMasterSchedule = async (req, res) => {
    let transaction;
    try {
        const { doctorId, schedules } = req.body;

        if (!doctorId || !schedules || !Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({ success: false, message: "DoctorId and an array of schedules are required." });
        }

        const pool = await connectDB();
        
        // ENTERPRISE FIX: Use Node-level SQL Transaction for safe multi-inserts
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        let insertedCount = 0;

        for (let schedule of schedules) {
            const { dayOfWeek, startTime, endTime } = schedule;
            if (!dayOfWeek || !startTime || !endTime) continue; 

            const request = new sql.Request(transaction);
            await request
                .input('DoctorId', sql.Int, doctorId)
                .input('DayOfWeek', sql.NVarChar, dayOfWeek)
                .input('StartTime', sql.VarChar, startTime) 
                .input('EndTime', sql.VarChar, endTime)
                .query(`
                    INSERT INTO DoctorMasterSchedules (DoctorId, DayOfWeek, StartTime, EndTime, SlotDuration, IsActive)
                    VALUES (@DoctorId, @DayOfWeek, @StartTime, @EndTime, 30, 1)
                `);
            
            insertedCount++;
        }

        await transaction.commit();
        return res.status(201).json({ success: true, message: `Successfully added ${insertedCount} schedule(s) for the doctor.` });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("[Schedule Engine] Add Master Schedule Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @function addLeave
 * @description Admin/Doctor blocks a specific date/time for leave
 * @route POST /api/schedule/leave
 * @access Private (Admin/Doctor)
 */
const addLeave = async (req, res) => {
    try {
        const { doctorId, leaveDate, startTime, endTime, reason } = req.body;

        if (!doctorId || !leaveDate) {
            return res.status(400).json({ success: false, message: "DoctorId and LeaveDate are required." });
        }

        const pool = await connectDB();
        await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .input('LeaveDate', sql.Date, leaveDate)
            .input('StartTime', sql.VarChar, startTime || null)
            .input('EndTime', sql.VarChar, endTime || null)
            .input('Reason', sql.NVarChar, reason || null)
            .query(`
                INSERT INTO DoctorLeaves (DoctorId, LeaveDate, StartTime, EndTime, Reason, IsActive)
                VALUES (@DoctorId, @LeaveDate, @StartTime, @EndTime, @Reason, 1)
            `);

        return res.status(201).json({ success: true, message: "Leave added successfully." });
    } catch (error) {
        console.error("[Schedule Engine] Add Leave Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @function generateDailySlots
 * @description ENGINE: Handles Full/Partial Leaves & UTC Timezone to generate safe slots
 * @route POST /api/schedule/generate
 * @access Private (Admin/Doctor)
 */
const generateDailySlots = async (req, res) => {
    try {
        const { doctorId, targetDate } = req.body; 

        const pool = await connectDB();

        // TIMEZONE FIX: Strictly forcing IST so the server location doesn't shift the day
        const dateObj = new Date(targetDate); 
        const dayOfWeek = dateObj.toLocaleDateString('en-IN', { 
            timeZone: 'Asia/Kolkata', 
            weekday: 'long' 
        });
        
        // Fetch all leaves for this doctor on this date
        const leaveCheck = await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .input('LeaveDate', sql.VarChar, targetDate)
            .query(`
                SELECT 
                    CONVERT(varchar(8), StartTime, 108) AS StartTime, 
                    CONVERT(varchar(8), EndTime, 108) AS EndTime 
                FROM DoctorLeaves 
                WHERE DoctorId = @DoctorId AND LeaveDate = @LeaveDate AND IsActive = 1
            `);
        const leaves = leaveCheck.recordset;

        // Check if there is a full-day leave
        const hasFullDayLeave = leaves.some(leave => leave.StartTime === null);
        if (hasFullDayLeave) {
            return res.status(200).json({ success: true, message: "Doctor is on full-day leave. No slots generated." });
        }

        // Get Master Schedule for this day
        const schedule = await pool.request()
            .input('DoctorId', sql.Int, doctorId)
            .input('DayOfWeek', sql.NVarChar, dayOfWeek)
            .query(`
                SELECT 
                    CONVERT(varchar(8), StartTime, 108) AS StartTime, 
                    CONVERT(varchar(8), EndTime, 108) AS EndTime 
                FROM DoctorMasterSchedules 
                WHERE DoctorId = @DoctorId AND DayOfWeek = @DayOfWeek AND IsActive = 1
            `);

        if (schedule.recordset.length === 0) {
            return res.status(200).json({ success: true, message: "Doctor does not work on this day." });
        }

        // Time Calculation & PARTIAL LEAVE LOGIC
        let generatedCount = 0;
        for (let shift of schedule.recordset) {
            let current = new Date(`${targetDate}T${shift.StartTime}Z`);
            let end = new Date(`${targetDate}T${shift.EndTime}Z`);

            while (current < end) {
                let slotStart = current.toISOString().substring(11, 19); 
                current.setMinutes(current.getMinutes() + 30); 
                let slotEnd = current.toISOString().substring(11, 19);

                // Check if this slot overlaps with any partial leave
                let isSlotBlockedByLeave = false;
                for (let leave of leaves) {
                    if (slotStart < leave.EndTime && slotEnd > leave.StartTime) {
                        isSlotBlockedByLeave = true;
                        break;
                    }
                }

                // Insert into DB only if it doesn't overlap with a leave
                if (!isSlotBlockedByLeave) {
                    await pool.request()
                        .input('DoctorId', sql.Int, doctorId)
                        .input('SlotDate', sql.VarChar, targetDate)
                        .input('StartTime', sql.VarChar, slotStart)
                        .input('EndTime', sql.VarChar, slotEnd)
                        .query(`
                            IF NOT EXISTS (SELECT 1 FROM DoctorSlots WHERE DoctorId = @DoctorId AND SlotDate = @SlotDate AND StartTime = @StartTime)
                            BEGIN
                                INSERT INTO DoctorSlots (DoctorId, SlotDate, StartTime, EndTime, Status)
                                VALUES (@DoctorId, @SlotDate, @StartTime, @EndTime, 'Available')
                            END
                        `);
                    generatedCount++;
                }
            }
        }

        return res.status(201).json({ success: true, message: `${generatedCount} slots generated for ${targetDate}.` });
    } catch (error) {
        console.error("[Schedule Engine] Generate Slots Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @function getAvailableSlots
 * @description Smart Engine: Returns available slots. 
 *              If the patient has a default doctor, shows only their personalized slots.
 *              Otherwise, shows all available slots across the platform blindly.
 * @route GET /api/schedule/slots/:date
 * @access Protected (Patient)
 */
const getAvailableSlots = async (req, res) => {
    try {
        const { date } = req.params;
        const patientId = req.user.userId;

        const pool = await connectDB();

        // 1. Check if the patient has a default doctor mapped (from a previous package purchase)
        const checkUser = await pool.request()
            .input('UserId', sql.Int, patientId)
            .query(`SELECT DefaultDoctorId FROM users WHERE UserId = @UserId`);
        
        const defaultDoctorId = checkUser.recordset.length > 0 ? checkUser.recordset[0].DefaultDoctorId : null;

        let slotsResult;

        if (defaultDoctorId) {
            // SCENARIO A: Patient is locked to a specific doctor (Package Holder)
            slotsResult = await pool.request()
                .input('DoctorId', sql.Int, defaultDoctorId)
                .input('SlotDate', sql.Date, date)
                .query(`
                    SELECT 
                        SlotId, 
                        CONVERT(varchar(8), StartTime, 108) AS StartTime, 
                        CONVERT(varchar(8), EndTime, 108) AS EndTime, 
                        Status 
                    FROM DoctorSlots 
                    WHERE DoctorId = @DoctorId AND SlotDate = @SlotDate AND Status = 'Available'
                    ORDER BY StartTime ASC
                `);
        } else {
            // SCENARIO B: New Patient (Blind Booking)
            slotsResult = await pool.request()
                .input('SlotDate', sql.Date, date)
                .query(`
                    SELECT 
                        MIN(SlotId) AS SlotId, 
                        CONVERT(varchar(8), StartTime, 108) AS StartTime, 
                        CONVERT(varchar(8), EndTime, 108) AS EndTime, 
                        'Available' AS Status
                    FROM DoctorSlots
                    WHERE SlotDate = @SlotDate AND Status = 'Available'
                    GROUP BY StartTime, EndTime
                    ORDER BY StartTime ASC
                `);
        }

        return res.status(200).json({ 
            success: true, 
            message: defaultDoctorId ? "Fetched personalized slots for your assigned doctor." : "Fetched platform available slots.",
            data: slotsResult.recordset 
        });
    } catch (error) {
        console.error("[Slot Engine Error]:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @function bookSlot
 * @description Securely locks slot, creates Appointment, auto-generates 100ms Video Room, 
 *              and consumes the Nano Package / links the valid blood report.
 * @route PUT /api/schedule/book
 * @access Protected (Patient - Validated by Gatekeeper)
 */
const bookSlot = async (req, res) => {
    try {
        const patientId = req.user.userId; 
        const { slotId, consultationType, reason } = req.body;
        
        // Extracted securely from our checkActiveSubscription middleware
        const bookingType = req.bookingType; 
        const validReportId = req.validReportId || null;
        
        if (!slotId) {
            return res.status(400).json({ success: false, message: "SlotId is required to book an appointment." });
        }

        const pool = await connectDB();
        
        // We use a robust SQL Transaction to ensure Slot Locking, Appointment Creation, 
        // and Package Consumption happen simultaneously or not at all.
        const result = await pool.request()
            .input('SlotId', sql.Int, slotId)
            .input('UserId', sql.Int, patientId)
            .input('ConsultationType', sql.NVarChar, consultationType || 'Video')
            .input('Reason', sql.NVarChar, reason || null)
            .input('ReportId', sql.Int, validReportId)
            .input('BookingType', sql.VarChar, bookingType || '')
            .query(`
                BEGIN TRAN;
                DECLARE @DocId INT;
                DECLARE @NewAppId INT;

                -- Check if slot is available and strictly lock the row
                SELECT @DocId = DoctorId FROM DoctorSlots WITH (UPDLOCK) 
                WHERE SlotId = @SlotId AND Status = 'Available';

                IF @DocId IS NOT NULL
                BEGIN
                    -- 1. Mark the slot as Completed AND assign the PatientId
                    UPDATE DoctorSlots 
                    SET Status = 'Completed', PatientId = @UserId 
                    WHERE SlotId = @SlotId;

                    -- 2. Create the official receipt in Appointments table
                    INSERT INTO Appointments (SlotId, DoctorId, UserId, ConsultationType, Reason, Status)
                    VALUES (@SlotId, @DocId, @UserId, @ConsultationType, @Reason, 'Booked');

                    -- Capture the ID of the newly inserted Appointment
                    SET @NewAppId = SCOPE_IDENTITY();

                    -- 3. CONSUME NANO PACKAGE & LINK REPORT (If not a long-term Care Plan)
                    IF @BookingType = 'NANO_UPLOADED' OR @BookingType = 'NANO_LAB'
                    BEGIN
                        -- Mark Nano Package as consumed
                        UPDATE UserSubscriptions 
                        SET Status = 'Consumed' 
                        WHERE UserId = @UserId AND PlanID = 'NANO_PACKAGE' AND Status = 'Active';

                        -- Link the new appointment ID to the uploaded report (to prevent reuse)
                        IF @BookingType = 'NANO_UPLOADED' AND @ReportId IS NOT NULL
                        BEGIN
                            UPDATE PatientReports 
                            SET AppointmentId = @NewAppId 
                            WHERE ReportId = @ReportId;
                        END
                    END

                    COMMIT TRAN;
                    SELECT 1 AS Success, @NewAppId AS AppointmentId;
                END
                ELSE
                BEGIN
                    ROLLBACK TRAN;
                    SELECT 0 AS Success, NULL AS AppointmentId;
                END
            `);

        if (result.recordset[0].Success === 0) {
            return res.status(400).json({ success: false, message: "Sorry, this slot was just booked by someone else or is unavailable." });
        }

        const newAppointmentId = result.recordset[0].AppointmentId;

        // 4. 100MS INTEGRATION (Wrapped in try-catch to prevent booking failure if video server glitches)
        try {
            const videoDetails = await generateVideoRoomAndCodes(newAppointmentId);

            await pool.request()
                .input('AppointmentId', sql.Int, newAppointmentId)
                .input('VideoRoomId', sql.NVarChar, videoDetails.roomId)
                .input('PatientRoomCode', sql.NVarChar, videoDetails.patientCode)
                .input('DoctorRoomCode', sql.NVarChar, videoDetails.doctorCode)
                .input('PatientJoinLink', sql.NVarChar, videoDetails.patientLink)
                .input('DoctorJoinLink', sql.NVarChar, videoDetails.doctorLink)
                .query(`
                    UPDATE Appointments 
                    SET VideoRoomId = @VideoRoomId, 
                        PatientRoomCode = @PatientRoomCode, 
                        DoctorRoomCode = @DoctorRoomCode,
                        PatientJoinLink = @PatientJoinLink,
                        DoctorJoinLink = @DoctorJoinLink
                    WHERE AppointmentId = @AppointmentId
                `);
                
            console.log(`[100ms] Successfully attached secure video room for Appointment: ${newAppointmentId}`);
        } catch (videoError) {
            console.error("[100ms Booking Error] Video room creation failed but slot is secured:", videoError.message);
        }

        return res.status(200).json({ 
            success: true, 
            message: "Appointment successfully booked! The video link has been generated.",
            data: { appointmentId: newAppointmentId }
        });
    } catch (error) {
        console.error("[Schedule Engine] Booking Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @function cancelAppointment
 * @description Patient cancels their appointment, freeing the slot AND updating Appointment history
 * @route PUT /api/schedule/cancel
 * @access Protected (Patient)
 */
const cancelAppointment = async (req, res) => {
    try {
        const patientId = req.user.userId;
        const { slotId } = req.body; 

        if (!slotId) {
            return res.status(400).json({ success: false, message: "SlotId is required to cancel." });
        }

        const pool = await connectDB();
        
        const result = await pool.request()
            .input('SlotId', sql.Int, slotId)
            .input('UserId', sql.Int, patientId)
            .query(`
                BEGIN TRAN;
                DECLARE @AppId INT;

                SELECT @AppId = AppointmentId 
                FROM Appointments WITH (UPDLOCK)
                WHERE SlotId = @SlotId AND UserId = @UserId AND Status = 'Booked';

                IF @AppId IS NOT NULL
                BEGIN
                    UPDATE Appointments 
                    SET Status = 'Cancelled', CancelledAt = SYSDATETIME() 
                    WHERE AppointmentId = @AppId;

                    -- ENTERPRISE FIX: PatientId = NULL set kiya taaki data completely free ho jaye
                    UPDATE DoctorSlots 
                    SET Status = 'Available', PatientId = NULL 
                    WHERE SlotId = @SlotId;

                    COMMIT;
                    SELECT 1 AS Success;
                END
                ELSE
                BEGIN
                    ROLLBACK;
                    SELECT 0 AS Success;
                END
            `);

        if (result.recordset[0].Success === 0) {
            return res.status(400).json({ success: false, message: "Invalid request. Appointment not found or already cancelled." });
        }

        return res.status(200).json({ success: true, message: "Appointment cancelled successfully. The slot is open again." });
    } catch (error) {
        console.error("[Schedule Engine] Cancel Appointment Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

module.exports = {
    addMasterSchedule,
    addLeave,
    generateDailySlots,
    getAvailableSlots,
    bookSlot,
    cancelAppointment  
}; 



