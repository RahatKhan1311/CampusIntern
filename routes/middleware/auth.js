const jwt = require('jsonwebtoken');

// A single JWT secret for your application
const JWT_SECRET = 'abc';
if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not defined in .env. Using fallback key.');
}

/**
 * Middleware to authenticate a user via JWT.
 * It attaches the decoded user payload to the request.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err.message);
            return res.status(403).json({ message: 'Invalid token.' });
        }
        req.user = user;
        next();
    });
}

/**
 * Middleware to authorize access based on user roles.
 */
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied: insufficient privileges.' });
        }
        next();
    };
}

module.exports = { authenticateToken, authorizeRoles };