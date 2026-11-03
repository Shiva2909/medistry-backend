const { connectDB, sql } = require('../db');
const axios = require('axios'); // Optional: Keep if you plan to use real external APIs later

/**
 * @api {post} /api/trackers/stats
 * @description Upsert (Update or Insert) basic health stats (Water, Sleep, Weight)
 */
const updateHealthStats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { logDate, waterIntakeMl, sleepHours, weightKg } = req.body;

        if (!logDate) {
            return res.status(400).json({ success: false, message: "logDate (YYYY-MM-DD) is required." });
        }

        const pool = await connectDB();
        
        // Use IF EXISTS to either UPDATE the existing row or INSERT a new one for today
        await pool.request()
            .input('UserId', sql.Int, userId)
            .input('LogDate', sql.Date, logDate)
            .input('WaterIntakeMl', sql.Int, waterIntakeMl || 0)
            .input('SleepHours', sql.Decimal(4,2), sleepHours || 0)
            .input('WeightKg', sql.Decimal(5,2), weightKg || null)
            .query(`
                IF EXISTS (SELECT 1 FROM DailyHealthLogs WHERE UserId = @UserId AND LogDate = @LogDate)
                BEGIN
                    UPDATE DailyHealthLogs 
                    SET 
                        WaterIntakeMl = ISNULL(@WaterIntakeMl, WaterIntakeMl),
                        SleepHours = ISNULL(@SleepHours, SleepHours),
                        WeightKg = ISNULL(@WeightKg, WeightKg),
                        LastUpdated = GETDATE()
                    WHERE UserId = @UserId AND LogDate = @LogDate
                END
                ELSE
                BEGIN
                    INSERT INTO DailyHealthLogs (UserId, LogDate, WaterIntakeMl, SleepHours, WeightKg)
                    VALUES (@UserId, @LogDate, @WaterIntakeMl, @SleepHours, @WeightKg)
                END
            `);

        return res.status(200).json({ success: true, message: "Health stats updated successfully." });
    } catch (error) {
        console.error("[Tracker] Update Stats Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * @api {post} /api/trackers/food
 * @description Logs a food item and updates total calories in the main log
 */
const logFoodItem = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { logDate, mealType, foodName, calories, protein, carbs } = req.body;

        if (!logDate || !mealType || !foodName || calories === undefined) {
            return res.status(400).json({ success: false, message: "logDate, mealType, foodName, and calories are required." });
        }

        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);
            
            // Step 1: Ensure DailyLog exists and update TotalCalories
            await request
                .input('UserId', sql.Int, userId)
                .input('LogDate', sql.Date, logDate)
                .input('Calories', sql.Int, calories)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM DailyHealthLogs WHERE UserId = @UserId AND LogDate = @LogDate)
                    BEGIN
                        INSERT INTO DailyHealthLogs (UserId, LogDate, TotalCalories) 
                        VALUES (@UserId, @LogDate, @Calories)
                    END
                    ELSE
                    BEGIN
                        UPDATE DailyHealthLogs 
                        SET TotalCalories = TotalCalories + @Calories, LastUpdated = GETDATE()
                        WHERE UserId = @UserId AND LogDate = @LogDate
                    END
                `);

            // Step 2: Fetch the LogId (whether newly created or existing)
            const logIdResult = await request.query(`
                SELECT LogId FROM DailyHealthLogs WHERE UserId = @UserId AND LogDate = @LogDate
            `);
            const logId = logIdResult.recordset[0].LogId;

            // Step 3: Insert the specific food item
            await request
                .input('LogId', sql.Int, logId)
                .input('MealType', sql.NVarChar, mealType)
                .input('FoodName', sql.NVarChar, foodName)
                .input('Protein', sql.Decimal(5,2), protein || 0)
                .input('Carbs', sql.Decimal(5,2), carbs || 0)
                .query(`
                    INSERT INTO DailyFoodItems (LogId, MealType, FoodName, Calories, Protein, Carbs)
                    VALUES (@LogId, @MealType, @FoodName, @Calories, @Protein, @Carbs)
                `);

            await transaction.commit();
            return res.status(201).json({ success: true, message: "Food logged successfully." });
        } catch (txnErr) {
            await transaction.rollback();
            throw txnErr;
        }
    } catch (error) {
        console.error("[Tracker] Log Food Error:", error);
        return res.status(500).json({ success: false, message: "Failed to log food item." });
    }
};

/**
 * @api {get} /api/trackers/daily?date=YYYY-MM-DD
 * @description Fetches all health data and food meals for a specific calendar date
 */
const getDailyHealthLog = async (req, res) => {
    try {
        const userId = req.user.userId;
        const selectedDate = req.query.date; 

        if (!selectedDate) {
            return res.status(400).json({ success: false, message: "Date is required (YYYY-MM-DD)" });
        }

        const pool = await connectDB();
        
        const logResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .input('LogDate', sql.Date, selectedDate)
            .query(`
                SELECT LogId, WaterIntakeMl, SleepHours, WeightKg, TotalCalories
                FROM DailyHealthLogs
                WHERE UserId = @UserId AND LogDate = @LogDate
            `);

        if (logResult.recordset.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    date: selectedDate,
                    stats: { water: 0, sleep: 0, weight: null, totalCalories: 0 },
                    meals: []
                }
            });
        }

        const dailyLog = logResult.recordset[0];

        const foodResult = await pool.request()
            .input('LogId', sql.Int, dailyLog.LogId)
            .query(`
                SELECT MealType, FoodName, Calories, Protein, Carbs
                FROM DailyFoodItems
                WHERE LogId = @LogId
                ORDER BY LoggedAt ASC
            `);

        return res.status(200).json({
            success: true,
            data: {
                date: selectedDate,
                stats: {
                    water: dailyLog.WaterIntakeMl,
                    sleep: dailyLog.SleepHours,
                    weight: dailyLog.WeightKg,
                    totalCalories: dailyLog.TotalCalories
                },
                meals: foodResult.recordset 
            }
        });

    } catch (error) {
        console.error("[Tracker] Fetch Daily Log Error:", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/**
 * @api {get} /api/trackers/search-food?query=apple
 * @description The frontend will call this API, and the backend will return dummy nutrition data for testing/presentation.
 */
const searchFoodNutrition = async (req, res) => {
    try {
        const query = req.query.query; 

        if (!query) {
            return res.status(400).json({ success: false, message: "Please provide a food query." });
        }

        const searchQuery = query.toLowerCase();

        // Rich Dummy Database (Best for presentations and testing without relying on third-party APIs)
        const dummyFoodDatabase = [
            { foodName: "Samosa", servingQuantity: 1, servingUnit: "piece", calories: 262, protein: 3.5, carbs: 32.0 },
            { foodName: "Paneer Butter Masala", servingQuantity: 1, servingUnit: "bowl", calories: 450, protein: 15.0, carbs: 12.0 },
            { foodName: "Roti (Chapati)", servingQuantity: 1, servingUnit: "piece", calories: 120, protein: 3.0, carbs: 20.0 },
            { foodName: "Dal Makhani", servingQuantity: 1, servingUnit: "bowl", calories: 300, protein: 14.0, carbs: 40.0 },
            { foodName: "Boiled Egg", servingQuantity: 1, servingUnit: "piece", calories: 78, protein: 6.3, carbs: 0.6 },
            { foodName: "Chicken Breast (Grilled)", servingQuantity: 100, servingUnit: "grams", calories: 165, protein: 31.0, carbs: 0.0 },
            { foodName: "Apple", servingQuantity: 1, servingUnit: "medium", calories: 95, protein: 0.5, carbs: 25.0 },
            { foodName: "Banana", servingQuantity: 1, servingUnit: "medium", calories: 105, protein: 1.3, carbs: 27.0 },
            { foodName: "Oatmeal", servingQuantity: 1, servingUnit: "bowl", calories: 150, protein: 5.0, carbs: 27.0 },
            { foodName: "Masala Dosa", servingQuantity: 1, servingUnit: "piece", calories: 415, protein: 9.0, carbs: 65.0 },
            { foodName: "Idli", servingQuantity: 2, servingUnit: "pieces", calories: 118, protein: 4.0, carbs: 25.0 },
            { foodName: "White Rice", servingQuantity: 1, servingUnit: "cup", calories: 205, protein: 4.2, carbs: 44.5 }
        ];

        // 1. Check if the query matches any item in our dummy database
        const matchedFoods = dummyFoodDatabase.filter(item => 
            item.foodName.toLowerCase().includes(searchQuery)
        );

        // 2. If a match is found, return the matched items
        if (matchedFoods.length > 0) {
            return res.status(200).json({ 
                success: true, 
                data: matchedFoods 
            });
        }

        // 3. Fallback Logic: If the user searches for an item not in the list (e.g., 'Pizza'), 
        // generate a fake object instead of throwing an error to keep the app running smoothly.
        const fallbackData = [
            {
                foodName: query.charAt(0).toUpperCase() + query.slice(1), // Capitalize first letter
                servingQuantity: 1,
                servingUnit: "serving",
                calories: Math.floor(Math.random() * 300) + 150, // Random calories between 150 and 450
                protein: Math.floor(Math.random() * 15) + 2,
                carbs: Math.floor(Math.random() * 40) + 10
            }
        ];

        return res.status(200).json({ 
            success: true, 
            data: fallbackData 
        });

    } catch (error) {
        console.error("[Food Search API] Error:", error);
        return res.status(500).json({ success: false, message: "Internal server error during search." });
    }
};

// ============================================================================
// NEW SYMPTOMS TRACKER LOGIC
// ============================================================================

/**
 * @api {post} /api/trackers/symptoms
 * @description Adds a new symptom log for the patient
 */
const addSymptom = async (req, res) => {
    try {
        const userId = req.user.userId; 
        const { symptomName, severity, notes } = req.body;

        if (!symptomName || !severity) {
            return res.status(400).json({ 
                success: false, 
                message: "Symptom Name and Severity are required fields." 
            });
        }

        const pool = await connectDB();
        
        await pool.request()
            .input('UserId', sql.Int, userId)
            .input('SymptomName', sql.NVarChar, symptomName)
            .input('Severity', sql.NVarChar, severity)
            .input('Notes', sql.NVarChar, notes || null)
            .query(`
                INSERT INTO PatientSymptoms (UserId, SymptomName, Severity, Notes)
                VALUES (@UserId, @SymptomName, @Severity, @Notes)
            `);

        return res.status(201).json({ 
            success: true, 
            message: "Symptom logged successfully!" 
        });

    } catch (error) {
        console.error("[Add Symptom Error]:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

/**
 * @api {get} /api/trackers/symptoms/history
 * @description Fetches the symptom history of the patient for the last 30 days
 */
const getSymptomHistory = async (req, res) => {
    try {
        const userId = req.user.userId;

        const pool = await connectDB();
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT LogId, SymptomName, Severity, Notes, LoggedAt 
                FROM PatientSymptoms 
                WHERE UserId = @UserId 
                AND LoggedAt >= DATEADD(day, -30, GETDATE())
                ORDER BY LoggedAt DESC
            `);

        return res.status(200).json({ 
            success: true, 
            data: result.recordset 
        });

    } catch (error) {
        console.error("[Get Symptoms Error]:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// Export all the functions so they can be used in the routes
module.exports = { 
    updateHealthStats, 
    logFoodItem, 
    getDailyHealthLog, 
    searchFoodNutrition,
    addSymptom,
    getSymptomHistory
};