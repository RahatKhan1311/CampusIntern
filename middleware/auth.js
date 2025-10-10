const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // Header should be: "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'abc'); // fallback to 'abc'
        req.user = decoded; // attach user info to request
        next();
    } catch (err) {
        console.error('JWT verification failed:', err);
        res.status(403).json({ message: 'Invalid token.' });
    }
};

module.exports = authenticateToken;
