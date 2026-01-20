"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.optionalAuth = exports.requireAuth = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
            return;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({
                success: false,
                message: 'JWT secret is not configured'
            });
            return;
        }
        jsonwebtoken_1.default.verify(token, secret, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    res.status(401).json({
                        success: false,
                        message: 'Access token has expired'
                    });
                    return;
                }
                if (err.name === 'JsonWebTokenError') {
                    res.status(401).json({
                        success: false,
                        message: 'Invalid access token'
                    });
                    return;
                }
                res.status(401).json({
                    success: false,
                    message: 'Token verification failed'
                });
                return;
            }
            const payload = decoded;
            req.user = {
                userId: payload.userId,
                email: payload.email,
                role: payload.role
            };
            next();
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Authentication error',
            errors: [error instanceof Error ? error.message : 'Unknown error']
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
        return;
    }
    if (req.user.role !== 'admin') {
        res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireAuth = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
        return;
    }
    next();
};
exports.requireAuth = requireAuth;
const optionalAuth = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            next();
            return;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            next();
            return;
        }
        jsonwebtoken_1.default.verify(token, secret, (err, decoded) => {
            if (!err && decoded) {
                const payload = decoded;
                req.user = {
                    userId: payload.userId,
                    email: payload.email,
                    role: payload.role
                };
            }
            next();
        });
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const generateToken = (payload) => {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRE || '7d';
    if (!secret) {
        throw new Error('JWT secret is not configured');
    }
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT secret is not configured');
        }
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=auth.js.map