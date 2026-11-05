const cron = require('node-cron');
const { connectDB } = require('../db'); 

const startCronJobs = () => {
    // execute every day at midnight (00:00) (12:00 AM)
    cron.schedule('0 0 * * *', async () => {
        console.log("[CRON] Midnight maintenance tasks started...");
        try {
            const pool = await connectDB();

            // 1. Expire Subscriptions 
            const subResult = await pool.request().query(`
                UPDATE UserSubscriptions 
                SET Status = 'Expired' 
                WHERE EndDate < CAST(GETDATE() AS DATE) AND Status = 'Active'
            `);
            console.log(`[CRON] Expired ${subResult.rowsAffected[0]} old subscriptions.`);

            // 2. Mark Missed Appointments 
            const apptResult = await pool.request().query(`
                UPDATE A
                SET A.Status = 'Missed'
                FROM Appointments A
                JOIN DoctorSlots S ON A.SlotId = S.SlotId
                WHERE A.Status = 'Booked' 
                  AND S.SlotDate < CAST(GETDATE() AS DATE)
            `);
            
            console.log(`[CRON] Marked ${apptResult.rowsAffected[0]} appointments as Missed.`);

        } catch (error) {
            console.error("[CRON Error]:", error);
        }
    });
};

module.exports = startCronJobs;