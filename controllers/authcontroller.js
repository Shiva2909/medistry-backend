const { connectDB, sql } = require('../db'); // DB Connection
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// todo: make otp dynamic after testing  
const sendOtp = async (req, res) => {
    try {
        const { mobile } = req.body;
        const otp = "1111"
        //const otp = Math.floor(1000 + Math.random() * 9000).toString(); 
        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(otp, salt); 
        const expiresAt = new Date(new Date().getTime() + 100 * 60000); 

        const pool = await connectDB();
        await pool.request()
            .input('mobile', sql.VarChar, mobile)
            .input('otpHash', sql.VarChar, otpHash)
            .input('expiresAt', sql.DateTime, expiresAt)
            .query('INSERT INTO otpsessions (mobile, otphash, expiresat) VALUES (@mobile, @otpHash, @expiresAt)');

        console.log(`[TESTING ONLY] OTP: ${otp}`);
        return res.json({ success: true, data: {}, message: "OTP sent", error: null });
    } catch (error) {
        console.log(error)
        return res.json({ success: false, data: {}, message: error.message, error: "INTERNAL_ERROR" });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        const pool = await connectDB();

        const otpResult = await pool.request()
            .input('mobile', sql.VarChar, mobile)
            .query('SELECT TOP 1 * FROM otpsessions WHERE mobile = @mobile ORDER BY id DESC');
        const otpRecord = otpResult.recordset[0];

        if (!otpRecord) return res.json({ success: false, data: {}, message: null, error: "INVALID_OTP" }); 

        const isValidOtp = await bcrypt.compare(otp, otpRecord.otphash);
        if (!isValidOtp || new Date() > new Date(otpRecord.expiresat)) {
            return res.json({ success: false, data: {}, message: null, error: "INVALID_OTP" }); 
        }

        // Fetching user with the new UserId (INT) and Role columns
        let userResult = await pool.request()
            .input('mobile', sql.VarChar, mobile)
            .query('SELECT id, UserId, Role, mobile, onboardingcompleted FROM users WHERE mobile = @mobile');
        
        let user = userResult.recordset[0];
        
        if (!user) {
            // New User Registration: Auto-fetching the newly generated INT UserId and default Role
            const newUserId = crypto.randomUUID(); 
            const insertResult = await pool.request()
                .input('id', sql.VarChar, newUserId)
                .input('mobile', sql.VarChar, mobile)
                .query(`
                    INSERT INTO users (id, mobile, mobileverified) 
                    OUTPUT INSERTED.id, INSERTED.UserId, INSERTED.Role, INSERTED.onboardingcompleted 
                    VALUES (@id, @mobile, 1)
                `);
            user = insertResult.recordset[0];
        }



// ================================================================
// PERMANENT SOLUTION: AUTO-LINK DOCTOR PROFILE ON LOGIN
// ================================================================
try {
    const doctorCheck = await pool.request()
        .input('Mobile', sql.VarChar, user.mobile)
        .query('SELECT DoctorId, UserId FROM Doctors WHERE Phone = @Mobile');

    if (doctorCheck.recordset.length > 0) {
        const docRecord = doctorCheck.recordset[0];
        
       
        //if doctor exits but userid is null then create on that same time
        if (!docRecord.UserId) {
            await pool.request()
                .input('UserId', sql.Int, user.UserId)
                .input('DoctorId', sql.Int, docRecord.DoctorId)
                .query(`
                    UPDATE Doctors SET UserId = @UserId WHERE DoctorId = @DoctorId;
                    UPDATE users SET Role = 'Doctor' WHERE UserId = @UserId;
                `);
            
            // update current user
            user.Role = 'Doctor';
            console.log(`[SYSTEM] Auto-linked User ${user.UserId} to Doctor ${docRecord.DoctorId}`);
        }
    }
} catch (linkError) {
    console.error("Doctor Auto-Link Error:", linkError);
    
}
// ================================================================

        const accessToken = jwt.sign(
            { userId: user.UserId, uuid: user.id, role: user.Role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        const refreshToken = crypto.randomUUID(); 
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

        // Keeping uuid (user.id) for the session table to match your old string schema
        await pool.request()
            .input('userId', sql.VarChar, user.id)
            .input('refreshTokenHash', sql.VarChar, hashedRefreshToken)
            .input('expiresAt', sql.DateTime, sessionExpiry)
            .query('INSERT INTO usersessions (userid, refreshtokenhash, expiresat) VALUES (@userId, @refreshTokenHash, @expiresAt)');

        return res.json({ 
            success: true,
            data: { accessToken, refreshToken, nextScreen: user.onboardingcompleted ? "DASHBOARD" : "ONBOARDING" }, 
            message: "Login successful",
            error: null
        });     
    } catch (error) {
        console.error(error);
        return res.json({ success: false, data: {}, message: null, error: "INTERNAL_ERROR" });
    }
};

const getMe = async (req, res) => {
    try {
        const pool = await connectDB();
        // Searching via INT UserId now
        const result = await pool.request()
            .input('UserId', sql.Int, req.user.userId)
            .query('SELECT id, UserId, Role, mobile, onboardingcompleted, profiledata FROM users WHERE UserId = @UserId');
        
        if (result.recordset.length === 0) {
            return res.json({ success: false, data: {}, message: "User not found", error: "NOT_FOUND" });
        }

        return res.json({ success: true, data: result.recordset[0], message: "User fetched", error: null }); 
    } catch (error) {
        return res.json({ success: false, data: {}, message: null, error: "INTERNAL_ERROR" });
    }
};

module.exports = { sendOtp, verifyOtp, getMe };