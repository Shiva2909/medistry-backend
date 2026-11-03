const { connectDB, sql } = require('../db');

/**
 * @function enforceVerifiedReport
 * @description Enterprise Flow: Prevents doctor slot booking unless a verified report exists.
 */
const enforceVerifiedReport = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const pool = await connectDB();

        // Check if the user has ANY report that is approved (Either manually uploaded or via Lab Webhook)
        const reportCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT TOP 1 ReportId, VerificationStatus 
                FROM PatientReports 
                WHERE UserId = @UserId AND VerificationStatus = 'Approved' 
                ORDER BY UploadedAt DESC
            `);

        if (reportCheck.recordset.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: "Doctor consultation is locked. Please upload a blood report and wait for admin approval, or book a lab test first." 
            });
        }

        // Pass the valid report ID to the next controller (like bookSlot) so it can be auto-linked
        req.validReportId = reportCheck.recordset[0].ReportId;
        next();

    } catch (error) {
        console.error("[Gatekeeper] Report Verification Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error during verification check." });
    }
};

module.exports = { enforceVerifiedReport };