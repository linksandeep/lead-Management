"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./utils/database");
const routes_1 = __importDefault(require("./routes"));
const middleware_1 = require("./middleware");
const User_1 = __importDefault(require("./models/User"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false
}));
app.use((0, cors_1.default)(middleware_1.corsOptions));
app.use(middleware_1.securityHeaders);
const limiter = (0, middleware_1.createRateLimiter)(Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100);
app.use('/api', limiter);
app.use((0, compression_1.default)());
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
    app.use(middleware_1.requestLogger);
}
else {
    app.use((0, morgan_1.default)('combined'));
}
app.use(express_1.default.json({
    limit: process.env.UPLOAD_MAX_SIZE || '10mb',
    strict: true
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: process.env.UPLOAD_MAX_SIZE || '10mb'
}));
app.use(middleware_1.bodyParserErrorHandler);
const uploadsDir = path_1.default.join(__dirname, '../uploads');
app.use('/uploads', express_1.default.static(uploadsDir));
app.get('/health', middleware_1.healthCheck);
app.use(process.env.API_PREFIX || '/api', routes_1.default);
app.get('/api/test', (_req, res) => {
    res.json({
        success: true,
        message: 'Lead Manager API is working!',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.get('/', (_req, res) => {
    res.json({
        name: 'Lead Manager API',
        version: '1.0.0',
        status: 'Running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            api: '/api',
            test: '/api/test'
        }
    });
});
app.use(middleware_1.notFoundHandler);
app.use(middleware_1.errorHandler);
const ensureSystemUser = async () => {
    try {
        const systemUser = await User_1.default.findOne({ email: 'system@leadmanager.com' });
        if (!systemUser) {
            console.log('🔧 Creating system user...');
            await User_1.default.create({
                name: 'System',
                email: 'system@leadmanager.com',
                password: 'system123456',
                role: 'admin',
                isActive: true
            });
            console.log('✅ System user created successfully');
        }
        else {
            console.log('✅ System user already exists');
        }
    }
    catch (error) {
        console.error('❌ Failed to ensure system user exists:', error);
    }
};
const gracefulShutdown = (signal) => {
    console.log(`📴 Received ${signal}, shutting down gracefully`);
    server.close((err) => {
        if (err) {
            console.error('❌ Error during server close:', err);
            process.exit(1);
        }
        console.log('📴 HTTP server closed');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};
const startServer = async () => {
    try {
        await (0, database_1.connectDatabase)();
        await ensureSystemUser();
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📱 API Base URL: http://localhost:${PORT}${process.env.API_PREFIX || '/api'}`);
            console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            if (process.env.NODE_ENV === 'development') {
                console.log(`🧪 Test Endpoint: http://localhost:${PORT}/api/test`);
            }
        });
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        return server;
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});
let server;
startServer().then((s) => {
    server = s;
});
exports.default = app;
//# sourceMappingURL=server.js.map