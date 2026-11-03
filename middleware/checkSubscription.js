const { connectDB, sql } = require('../db');

/**
 * @middleware checkActiveSubscription
 * @description Enterprise Gatekeeper based on DurationMonths.
 *              DurationMonths > 0 = Care Plan (Bypasses Nano flow).
 *              DurationMonths = 0 = Nano Package (Requires Approved Report).
 */
const checkActiveSubscription = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const pool = await connectDB();
        console.log("[Gatekeeper] Validating Booking Eligibility For UserId:", userId);

        // STEP 1: CHECK FOR ANY ACTIVE PLAN WITH ITS DURATION
        const subResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT TOP 1 us.UserSubId, us.PlanId, us.EndDate, sp.DurationMonths 
                FROM UserSubscriptions us
                JOIN SubscriptionPlans sp ON us.PlanId = sp.PlanId
                WHERE us.UserId = @UserId 
                  AND us.Status = 'Active' 
                  AND GETDATE() BETWEEN us.StartDate AND us.EndDate
                ORDER BY us.EndDate DESC
            `);

        if (subResult.recordset.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: "Payment Required: You do not have an active consultation pass.",
                actionRequired: "PAYMENT_REQUIRED" 
            });
        }

        const activePlan = subResult.recordset[0];

        // STEP 2: PREMIUM USER BYPASS (If Duration > 0, it's a Long-term Care Plan)
        if (activePlan.DurationMonths > 0) {
            console.log("[Gatekeeper] Active Long-Term Care Plan found (Duration > 0). Access Granted.");
            req.bookingType = 'CARE_PLAN'; 
            return next();
        }

        // STEP 3: NANO PACKAGE VALIDATION (Duration = 0)
        // A. Check for an Approved Uploaded Report
        const uploadedReportCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT TOP 1 ReportId 
                FROM PatientReports 
                WHERE UserId = @UserId 
                  AND VerificationStatus = 'Approved'
                  AND AppointmentId IS NULL 
                ORDER BY UploadedAt DESC
            `);

        if (uploadedReportCheck.recordset.length > 0) {
            console.log("[Gatekeeper] Nano Package + Approved Uploaded Report found. Access Granted.");
            req.bookingType = 'NANO_UPLOADED';
            req.validReportId = uploadedReportCheck.recordset[0].ReportId;
            return next();
        }

        // B. Check for an Approved Partner Lab Test
        const labTestCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT TOP 1 BookingId 
                FROM LabBookings 
                WHERE UserId = @UserId AND Status = 'Report_Generated' 
                ORDER BY CollectionDate DESC
            `);

        if (labTestCheck.recordset.length > 0) {
            console.log("[Gatekeeper] Nano Package + Approved Lab Test found. Access Granted.");
            req.bookingType = 'NANO_LAB';
            req.validLabBookingId = labTestCheck.recordset[0].BookingId;
            return next();
        }

        // STEP 4: PAYMENT DONE, BUT REPORT PENDING
        return res.status(403).json({ 
            success: false, 
            message: "Report Pending: Your payment is successful, but your blood report is still awaiting Admin approval or Lab generation.",
            actionRequired: "WAIT_FOR_APPROVAL" 
        });

    } catch (error) {
        console.error("[Gatekeeper] Subscription Check Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { checkActiveSubscription };