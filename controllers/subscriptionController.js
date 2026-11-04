const { connectDB, sql } = require('../db');

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
 * @description Activates a plan manually via Admin/Postman HTTP Call.
 * @route POST /api/subscriptions/activate
 * @access Private (Admin)
 */
const activateUserSubscription = async (req, res) => {
    try {
        const { targetUserId, planId } = req.body; 
        const result = await activateSubscriptionInternal(targetUserId, planId);

        if (!result.success) {
             return res.status(404).json({ success: false, message: result.message || "Activation Failed" });
        }

        return res.json({              
            success: true, 
            data: result.data,
            message: result.message 
        });

    } catch (error) {
        console.error("[Subscription] Activate Subscription Request Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// ========================================================================
// INTERNAL FUNCTION (Called by Payment Controller after successful payment)
// ========================================================================
// ========================================================================
// INTERNAL FUNCTION (Called by Payment Controller after successful payment)
// ========================================================================
const activateSubscriptionInternal = async (targetUserId, planId) => {
    try {
        const pool = await connectDB();

        const planResult = await pool.request()
            .input('PlanId', sql.Int, planId)
            .query("SELECT PlanName, DurationMonths FROM SubscriptionPlans WHERE PlanId = @PlanId AND IsActive = 1");

        if (planResult.recordset.length === 0) {
            console.error(`[Internal Activation] PlanId ${planId} not found or inactive.`);
            return { success: false, message: "Invalid or Inactive Plan ID." };
        }

        const { PlanName, DurationMonths } = planResult.recordset[0];

        // Expire old active plans
        await pool.request()
            .input('UserId', sql.Int, targetUserId)
            .query("UPDATE UserSubscriptions SET Status = 'Expired' WHERE UserId = @UserId AND Status = 'Active'");

        // Insert new active plan (Removed PlanName from INSERT statement)
        const insertResult = await pool.request()
            .input('UserId', sql.Int, targetUserId)
            .input('PlanId', sql.Int, planId)
            .input('MonthsToAdd', sql.Int, DurationMonths)
            .query(`
                INSERT INTO UserSubscriptions (UserId, PlanId, StartDate, EndDate, Status)
                OUTPUT INSERTED.StartDate, INSERTED.EndDate
                VALUES (
                    @UserId, 
                    @PlanId, 
                    GETDATE(), 
                    CASE 
                        WHEN @MonthsToAdd = 0 THEN DATEADD(day, 7, GETDATE()) 
                        ELSE DATEADD(month, @MonthsToAdd, GETDATE()) 
                    END, 
                    'Active'
                )
            `);

        // Lock-in Default Doctor if it's a long term plan
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
        
        console.log(`[SYSTEM] Subscription ${PlanName} auto-activated for User ${targetUserId}.`);
        return { 
            success: true, 
            data: insertResult.recordset[0],
            message: `Successfully activated ${PlanName} for the user.` 
        };

    } catch (error) {
        console.error("[Internal Activation Error]:", error.message);
        return { success: false, message: error.message };
    }
};
// Export all the required modules!
module.exports = { 
    getAvailablePlans, 
    activateUserSubscription,
    activateSubscriptionInternal   
};