const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// 1. Token Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.json({ success: false, data: {}, message: null, error: "NOT_AUTHORISED" }); 

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.json({ success: false, data: {}, message: null, error: "NOT_AUTHORISED" }); 
        
        // user variable will contain the decoded JWT payload 
        // Example: { userId: 1, role: 'ADMIN', iat: 167... }
        req.user = user; 
        next();
    });
};

// 2. Role Based Access Control (RBAC) Middleware
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // Check if token was verified and user exists in request
        if (!req.user || !req.user.role) {
            return res.status(403).json({ 
                success: false, 
                data: {}, 
                message: "Role information missing in token.", 
                error: "FORBIDDEN_ACCESS" 
            });
        }

        // Check if the user's role matches any of the allowed roles
        if (!allowedRoles.includes(req.user.role.toUpperCase())) {
            return res.status(403).json({ 
                success: false, 
                data: {}, 
                message: "Access Denied. You don't have permission to perform this action.", 
                error: "FORBIDDEN_ACCESS" 
            });
        }

        next(); // User has the correct role, proceed to the controller
    }
};

// 3. Rate Limiter for OTP
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { 
        success: false, 
        message: "Too many OTP requests. Please try again after 15 minutes.", 
        error: "RATE_LIMIT_EXCEEDED" 
    }
});

module.exports = { authenticateToken, authorizeRoles, otpLimiter };