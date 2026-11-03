const { connectDB, sql } = require('../db');

const saveStep = async (req, res) => {
    try {
        const userId = req.user.userId;
        const pool = await connectDB();
        
        
        const gender = req.body.gender || null;
        const bloodGroup = req.body.bloodGroup || req.body.blood_group || null;
        const heightCm = req.body.heightCm || req.body.height_cm || null;
        const weightKg = req.body.weightKg || req.body.weight_kg || null;
        
        let firstName = req.body.firstName || req.body.first_name || null;
        let lastName = req.body.lastName || req.body.last_name || null;
        
        if (req.body.fullName) {
            const parts = req.body.fullName.trim().split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ') || null;
        }

      
        await pool.request()
            .input('UserId', sql.Int, userId)
            .input('FirstName', sql.NVarChar, firstName)
            .input('LastName', sql.NVarChar, lastName)
            .input('Gender', sql.NVarChar, gender)
            .input('BloodGroup', sql.NVarChar, bloodGroup)
            .input('HeightCm', sql.Decimal(5,2), heightCm)
            .input('WeightKg', sql.Decimal(5,2), weightKg)
            .query(`
                UPDATE users 
                SET 
                    FirstName = ISNULL(@FirstName, FirstName),
                    LastName = ISNULL(@LastName, LastName),
                    Gender = ISNULL(@Gender, Gender),
                    BloodGroup = ISNULL(@BloodGroup, BloodGroup),
                    HeightCm = ISNULL(@HeightCm, HeightCm),
                    WeightKg = ISNULL(@WeightKg, WeightKg)
                WHERE UserId = @UserId
            `);

        const updatedData = { firstName, lastName, gender, bloodGroup, heightCm, weightKg };
        
        return res.json({ success: true, data: updatedData, message: "Step saved successfully", error: null });
    } catch (error) {
        console.error("Error in saveStep:", error);
        return res.status(500).json({ success: false, data: {}, message: "Server Error", error: "INTERNAL_ERROR" });
    }
};

const completeOnboarding = async (req, res) => {
    try {
        const userId = req.user.userId;
        const pool = await connectDB();

        // Check if mandatory fields are filled in the table
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query('SELECT FirstName, HeightCm, WeightKg FROM users WHERE UserId = @UserId');
            
        if (result.recordset.length === 0) {
             return res.status(404).json({ success: false, data: {}, message: "User not found", error: "USER_NOT_FOUND" });
        }

        const user = result.recordset[0];
        
        // Validation: Height and weight are required fields
        if (!user.HeightCm || !user.WeightKg) {
            return res.status(400).json({ success: false, data: {}, message: "Height and Weight are required to complete onboarding", error: "ONBOARDING_INCOMPLETE" }); 
        }

        // BMI Calculation on Backend
        const heightMeters = user.HeightCm / 100;
        const bmi = (user.WeightKg / (heightMeters * heightMeters)).toFixed(2);

        // Mark onboarding as complete
        await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`UPDATE users SET onboardingcompleted = 1 WHERE UserId = @UserId`);

        return res.json({ success: true, data: { bmi: parseFloat(bmi) }, message: "Onboarding complete", error: null });
    } catch (error) {
        console.error("Error in completeOnboarding:", error);
        return res.status(500).json({ success: false, data: {}, message: "Server Error", error: "INTERNAL_ERROR" });
    }
};

const getCompletedOnboardingUsers = async (req, res) => {
    try {
        const pool = await connectDB();

        // Query to fetch all users who have completed their onboarding
        const result = await pool.request()
            .query(`
                SELECT 
                    UserId, 
                    FirstName, 
                    LastName, 
                    mobile,
                    Gender, 
                    BloodGroup, 
                    HeightCm, 
                    WeightKg, 
                    onboardingcompleted 
                FROM users 
                WHERE onboardingcompleted = 1
            `);

        // Check if any users exist
        if (result.recordset.length === 0) {
             return res.status(404).json({ 
                 success: false, 
                 data: [], 
                 message: "No users found with completed onboarding", 
                 error: "NOT_FOUND" 
             });
        }

        return res.status(200).json({ 
            success: true, 
            data: result.recordset, 
            message: "Fetched onboarded users successfully", 
            error: null 
        });
    } catch (error) {
        console.error("Error in getCompletedOnboardingUsers:", error);
        return res.status(500).json({ 
            success: false, 
            data: [], 
            message: "Server Error", 
            error: "INTERNAL_ERROR" 
        });
    }
};





module.exports = { saveStep, completeOnboarding,getCompletedOnboardingUsers };