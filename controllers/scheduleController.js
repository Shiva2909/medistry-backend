const { connectDB, sql } = require('../db');
// 1. IMPORTANT: Import the 100ms service here
const { generateVideoRoomAndCodes } = require('../utils/hmsService');

/**
 * @function addMasterSchedule
 * @description Admin/Doctor adds a weekly working shift (e.g., Monday 10:00 to 14:00)
 * @route POST /api/schedule/master
 */
const addMasterSchedule = async (req, res) => {
    try {
        const { doctorId, schedules } = req.body;

        if (!doctorId || !schedules || !Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({ success: false, message: "DoctorId and an array of schedules are required." });
        }

        const pool = await connectDB();
        let insertedCount = 0;

        for (let schedule of schedules) {
            const { dayOfWeek, startTime, endTime } = schedule;

            if (!dayOfWeek || !startTime || !endTime) continue; 

            await pool.request()
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

        return res.status(201).json({ success: true, message: `Successfully added ${insertedCount} schedule(s) for the doctor.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function addLeave
 * @description Admin/Doctor blocks a specific date/time for leave
 * @route POST /api/schedule/leave
 */
const addLeave = async (req, res) => {
    try {
        const { doctorId, leaveDate, startTime, endTime, reason } = req.body;

        if (!doctorId || !leaveDate) {
            return res.status(400).json({ success: false, message: "DoctorId and LeaveDate are required" });
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
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function generateDailySlots
 * @description ENGINE: Handles Full/Partial Leaves & UTC Timezone to generate safe slots
 * @route POST /api/schedule/generate
 */
const generateDailySlots = async (req, res) => {
    try {
        const { doctorId, targetDate } = req.body; 

        const pool = await connectDB();

        // TIMEZONE FIX: Strictly forcing UTC so the day doesn't shift
        const dateObj = new Date(targetDate); 

        // 'en-IN' by using it automatically takes indian date and time 
        const dayOfWeek = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
        
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
        return res.status(200).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function getAvailableSlots
 * @description Patient fetches available slots for a doctor on a specific date
 * @route GET /api/schedule/slots/:doctorId/:date
 */
const getAvailableSlots = async (req, res) => {
    try {
        const { doctorId, date } = req.params;

        const pool = await connectDB();
        const slots = await pool.request()
            .input('DoctorId', sql.Int, doctorId)
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
        return res.status(200).json({ success: true, data: slots.recordset });
    } catch (error) {
        return res.status(200).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function bookSlot
 * @description SQL Transaction to securely lock slot AND create an Appointment record + Auto 100ms Video Room
 * @route PUT /api/schedule/book
 */
const bookSlot = async (req, res) => {
    try {
        const patientId = req.user.userId; 
        const { slotId, consultationType, reason } = req.body;

        if (!slotId) {
            return res.status(400).json({ success: false, message: "SlotId is required" });
        }

        const pool = await connectDB();
        
        // 2. UPDATED QUERY: Capturing the newly generated AppointmentId using SCOPE_IDENTITY()
        const result = await pool.request()
            .input('SlotId', sql.Int, slotId)
            .input('UserId', sql.Int, patientId)
            .input('ConsultationType', sql.NVarChar, consultationType || 'Physical')
            .input('Reason', sql.NVarChar, reason || null)
            .query(`
                BEGIN TRAN;
                DECLARE @DocId INT;
                DECLARE @NewAppId INT;

                -- Check if slot is available and lock the row
                SELECT @DocId = DoctorId FROM DoctorSlots WITH (UPDLOCK) 
                WHERE SlotId = @SlotId AND Status = 'Available';

                IF @DocId IS NOT NULL
                BEGIN
                    -- Mark the slot as Booked
                    UPDATE DoctorSlots 
                    SET Status = 'Booked' 
                    WHERE SlotId = @SlotId;

                    -- Create the official receipt in Appointments table
                    INSERT INTO Appointments (SlotId, DoctorId, UserId, ConsultationType, Reason, Status)
                    VALUES (@SlotId, @DocId, @UserId, @ConsultationType, @Reason, 'Booked');

                    -- Get the ID of the newly inserted Appointment
                    SET @NewAppId = SCOPE_IDENTITY();

                    COMMIT;
                    SELECT 1 AS Success, @NewAppId AS AppointmentId;
                END
                ELSE
                BEGIN
                    ROLLBACK;
                    SELECT 0 AS Success, NULL AS AppointmentId;
                END
            `);

        if (result.recordset[0].Success === 0) {
            return res.status(400).json({ success: false, message: "Sorry, this slot is already booked or unavailable." });
        }

        // Extract the newly generated AppointmentId from the SQL transaction
        const newAppointmentId = result.recordset[0].AppointmentId;

        // 3. 100MS INTEGRATION: Run this in a try-catch so if 100ms fails, the booking doesn't crash
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
                
            console.log(`[100ms] Successfully attached video room for Appointment: ${newAppointmentId}`);
        } catch (videoError) {
            console.error("[100ms Booking Error] Video room creation failed but slot is booked:", videoError.message);
            // We do NOT return error here, because the slot was already successfully booked.
        }

        return res.status(200).json({ 
            success: true, 
            message: "Appointment booked successfully and added to your dashboard!",
            data: { appointmentId: newAppointmentId }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

/**
 * @function cancelAppointment
 * @description Patient cancels their appointment, freeing the slot AND updating Appointment history
 * @route PUT /api/schedule/cancel
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

                    UPDATE DoctorSlots 
                    SET Status = 'Available' 
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
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
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