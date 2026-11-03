const { connectDB, sql } = require('../db');

/**
 * @function getAvailablePlans
 * @description Fetches all active subscription packages (Nano Package, 3-Month, 6-Month, etc.)
 * @route GET /api/subscriptions/plans
 * @access Public
 */
/**
 * @function getAvailablePlans
 * @description Fetches active subscription packages and groups them by type (Entry vs Long-term)
 * @route GET /api/subscriptions/plans
 * @access Public
 */
const getAvailablePlans = async (req, res) => {
    try {
        const pool = await connectDB();
        
        // Fetch all active plans
        const result = await pool.request().query("SELECT * FROM SubscriptionPlans WHERE IsActive = 1");
        
        const allPlans = result.recordset.map(plan => ({
            ...plan,
            Perks: plan.Perks ? JSON.parse(plan.Perks) : [] // Parse string to Array for frontend UI
        }));

        // Categorize plans for the frontend UI
        const entryPackages = allPlans.filter(plan => plan.DurationMonths === 0);
        const carePlans = allPlans.filter(plan => plan.DurationMonths > 0);

        return res.json({ 
            success: true, 
            data: {
                nanoPackages: entryPackages, // For the "Consult Now" or "Upload Report" screens
                carePlans: carePlans         // For the main "Buy Plan" screen after consultation
            }, 
            message: "Subscription plans fetched and categorized successfully." 
        });
    } catch (error) {
        console.error("[Subscription] Fetch Plans Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};
/**
 * @function activateUserSubscription
 * @description Activates a plan post-payment. If it's a long-term Care Plan, 
 *              it permanently locks the patient to the prescribing doctor.
 * @route POST /api/subscriptions/activate
 * @access Private (Admin/Payment Webhook)
 */
const activateUserSubscription = async (req, res) => {
    try {
        const { targetUserId, planId } = req.body; 
        const pool = await connectDB();

        const planResult = await pool.request()
            .input('PlanId', sql.Int, planId)
            .query("SELECT PlanName, DurationMonths FROM SubscriptionPlans WHERE PlanId = @PlanId AND IsActive = 1");

        if (planResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Invalid or Inactive Plan ID." });
        }

        const { PlanName, DurationMonths } = planResult.recordset[0];

        await pool.request()
            .input('UserId', sql.Int, targetUserId)
            .query("UPDATE UserSubscriptions SET Status = 'Expired' WHERE UserId = @UserId AND Status = 'Active'");

        const insertResult = await pool.request()
            .input('UserId', sql.Int, targetUserId)
            .input('PlanId', sql.Int, planId)
            .input('PlanName', sql.VarChar, PlanName)
            .input('MonthsToAdd', sql.Int, DurationMonths)
            .query(`
                INSERT INTO UserSubscriptions (UserId, PlanId, PlanName, StartDate, EndDate, Status)
                OUTPUT INSERTED.StartDate, INSERTED.EndDate
                VALUES (
                    @UserId, 
                    @PlanId, 
                    @PlanName,
                    GETDATE(), 
                    CASE 
                        WHEN @MonthsToAdd = 0 THEN DATEADD(day, 7, GETDATE()) 
                        ELSE DATEADD(month, @MonthsToAdd, GETDATE()) 
                    END, 
                    'Active'
                )
            `);

        // THE MAGIC: DEFAULT DOCTOR LOCK-IN (Only if DurationMonths > 0)
        if (DurationMonths > 0) {
            const prescribedDoctor = await pool.request()
                .input('UserId', sql.Int, targetUserId)
                .query(`
                    SELECT TOP 1 DoctorId 
                    FROM Prescriptions 
                    WHERE UserId = @UserId 
                    ORDER BY CreatedAt DESC
                `);

            if (prescribedDoctor.recordset.length > 0) {
                const defaultDoctorId = prescribedDoctor.recordset[0].DoctorId;

                await pool.request()
                    .input('UserId', sql.Int, targetUserId)
                    .input('DefaultDoctorId', sql.Int, defaultDoctorId)
                    .query(`UPDATE users SET DefaultDoctorId = @DefaultDoctorId WHERE UserId = @UserId`);
                    
                console.log(`[SYSTEM] Patient ${targetUserId} permanently locked to Default Doctor ${defaultDoctorId}.`);
            }
        }

        return res.json({              
            success: true, 
            data: insertResult.recordset[0],
            message: `Successfully activated ${PlanName} for the user.` 
        });

    } catch (error) {
        console.error("[Subscription] Activate Subscription Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

module.exports = { getAvailablePlans, activateUserSubscription };