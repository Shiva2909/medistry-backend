const {connectDB , sql} = require('../db');
const axios = require('axios');

const getHealthPrediction = async (req, res) =>{
    try {
        const userId = req.user.userId;
        const pool = await connectDB();



        // step 1: fetch last 7 days data using JSON                  
        const result = await pool.request()
           .input('UserID', sql.Int, userId)
           .query(`                                                                                 
                SELECT 
                    HL.SleepHours, 
                    HL.WaterIntakeMl, 
                    HL.TotalCalories, 
                    HL.WeightKg,
                    ISNULL((SELECT SUM(Carbs) FROM FoodItems FI WHERE FI.LogId = HL.LogId), 0) AS TotalCarbs
                FROM HealthLogs HL
                WHERE HL.UserId = @UserId                                                 
                  AND HL.LogDate >= DATEADD(day, -7, GETDATE())
            `);

        const logs = result.recordset;
        
        if (logs.length === 0) {
            return res.status(200).json({
                success:false,
                message:"Not enough health data logged .please log your daily routine for a few days to get AI prediction ."
            });
        }


        // step 2 : calculate average for the ai model
        let totalSleep = 0, totalWater = 0, totalCalories = 0, totalWeight = 0 ,totalCarbs = 0;
        const daysCount = logs.lenght;

        logs.forEach(log =>{
            totalSleep += log.SleepHours;
            totalWater += log.WaterIntakeMl;
            totalCalories += log.TotalCalories;
            totalWeight += log.WeightKg;
            totalCarbs += log.TotalCarbs;
        });
        

        // Ready objects for providing python model for prediction 
        const aiInputData = {
            Avg_Sleep: Number((totalSleep / daysCount).toFixed(2)),
            Avg_Water: Number((totalWater / daysCount).toFixed(2)),
            Avg_Calories: Number((totalCalories / daysCount).toFixed(2)),
            Avg_Carbs: Number((totalCarbs / daysCount).toFixed(2)),
            Current_Weight: Number((totalWeight / daysCount).toFixed(2))
        };
        console.log("Sending data to AI Model:",aiInputData);
        //step 3: call the python microservices :flask
        // python server is running on server 5000
        const pythonApiUrl = process.env.PYTHON_AI_URL || 'http://localhost:5000/predict';

        const aiResponse = await axios.post(pythonApiUrl, aiInputData);
        // step 4 = return prediction to frontend 
        return res.status(200).json({
            success: true,
            data: {
                analyzedDays: daysCount,
                averages: aiInputData,
                prediction: aiResponse.data
            },
            message: "AI Prediction generated successfully"
        });
          
            
    } catch (error) {
        console.error("[AI Prediction Error]:", error.message);

        // handle case where python server is down and not responding
        if (error.code === 'ECONNREFUSED') {
            return res.status(200).json({ success: false, message: "AI Engine is currently unreachable. Please ensure the Python microservice is running"});
        }


        return res.status(200).json({ success: false,})   
    }
}                     