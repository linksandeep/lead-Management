"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.securityHeaders = exports.validateContentType = exports.bodyParserErrorHandler = exports.requestLogger = exports.corsOptions = exports.createRateLimiter = exports.notFoundHandler = exports.errorHandler = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler = (error, _req, res, _next) => {
    console.error('Error:', error);
    let status = 500;
    let message = 'Internal server error';
    let errors = [];
    if (error.name === 'ValidationError') {
        status = 400;
        message = 'Validation error';
        errors = Object.values(error.errors).map((err) => err.message);
    }
    if (error.code === 11000) {
        status = 400;
        message = 'Duplicate field value';
        const field = Object.keys(error.keyValue)[0];
        errors = [`${field} already exists`];
    }
    if (error.name === 'CastError') {
        status = 400;
        message = 'Invalid ID format';
        errors = ['Please provide a valid ID'];
    }
    if (error.name === 'JsonWebTokenError') {
        status = 401;
        message = 'Invalid token';
        errors = ['Please provide a valid token'];
    }
    if (error.name === 'TokenExpiredError') {
        status = 401;
        message = 'Token expired';
        errors = ['Please login again'];
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        status = 400;
        message = 'File too large';
        errors = ['Please upload a smaller file'];
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
        status = 400;
        message = 'Too many files';
        errors = ['Please upload fewer files'];
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        status = 400;
        message = 'Unexpected file field';
        errors = ['Please check your file upload field'];
    }
    if (error.statusCode) {
        status = error.statusCode;
        message = error.message;
        if (error.errors) {
            errors = Array.isArray(error.errors) ? error.errors : [error.errors];
        }
    }
    res.status(status).json({
        success: false,
        message,
        errors: errors.length > 0 ? errors : undefined,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
};
exports.notFoundHandler = notFoundHandler;
const createRateLimiter = (windowMs, max) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: {
            success: false,
            message: 'Too many requests, please try again later'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        skip: (req) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return false;
                }
                const token = authHeader.split(' ')[1];
                if (!token) {
                    return false;
                }
                const secret = process.env.JWT_SECRET;
                if (!secret) {
                    return false;
                }
                const decoded = jsonwebtoken_1.default.verify(token, secret);
                if (decoded) {
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`🚀 Rate limiting skipped for authenticated user on ${req.method} ${req.path}`);
                    }
                    return true;
                }
                return false;
            }
            catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`⚠️ Rate limiting applied - invalid token on ${req.method} ${req.path}`);
                }
                return false;
            }
        },
        handler: (req, res) => {
            console.log(`🚫 Rate limit exceeded for ${req.ip} on ${req.method} ${req.path}`);
            res.status(429).json({
                success: false,
                message: 'Too many requests from this IP, please try again later',
                retryAfter: Math.round(windowMs / 1000)
            });
        }
    });
};
exports.createRateLimiter = createRateLimiter;
exports.corsOptions = {
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://127.0.0.1:5175'
        ];
        if (process.env.FRONTEND_URL) {
            allowedOrigins.push(process.env.FRONTEND_URL);
        }
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400
};
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, originalUrl, ip } = req;
        const { statusCode } = res;
        console.log(`${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`);
    });
    next();
};
exports.requestLogger = requestLogger;
const bodyParserErrorHandler = (error, _req, res, next) => {
    if (error instanceof SyntaxError && 'body' in error) {
        res.status(400).json({
            success: false,
            message: 'Invalid JSON in request body'
        });
        return;
    }
    next(error);
};
exports.bodyParserErrorHandler = bodyParserErrorHandler;
const validateContentType = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (!req.is('application/json') && !req.is('multipart/form-data')) {
            res.status(400).json({
                success: false,
                message: 'Content-Type must be application/json or multipart/form-data'
            });
            return;
        }
    }
    next();
};
exports.validateContentType = validateContentType;
const securityHeaders = (_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
};
exports.securityHeaders = securityHeaders;
const healthCheck = (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
};
exports.healthCheck = healthCheck;
//# sourceMappingURL=index.js.map