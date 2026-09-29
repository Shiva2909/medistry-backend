const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.json({ success: false, data: {}, message: null, error: "NOT_AUTHORISED" }); //[cite: 2]

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.json({ success: false, data: {}, message: null, error: "NOT_AUTHORISED" }); //[cite: 2]
        req.user = user; // { userId: '...'}
        next();
    });
};

module.exports = authenticateToken;