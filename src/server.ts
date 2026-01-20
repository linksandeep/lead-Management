import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { connectDatabase } from './utils/database';
import routes from './routes';
import { 
  errorHandler, 
  notFoundHandler, 
  createRateLimiter, 
  corsOptions,
  requestLogger,
  bodyParserErrorHandler,
  securityHeaders,
  healthCheck
} from './middleware';
import User from './models/User';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));
app.use(cors(corsOptions));
app.use(securityHeaders);

// Rate limiting - applies to all /api routes but skips authenticated users
const limiter = createRateLimiter(
  Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // 100 requests per window
);
app.use('/api', limiter);

// Compression and logging
app.use(compression());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  app.use(requestLogger);
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ 
  limit: process.env.UPLOAD_MAX_SIZE || '10mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.UPLOAD_MAX_SIZE || '10mb' 
}));

// Body parser error handling
app.use(bodyParserErrorHandler);

// Static file serving for uploads (create uploads directory if it doesn't exist)
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/health', healthCheck);

// API routes
app.use(process.env.API_PREFIX || '/api', routes);

// Temporary route for testing
app.get('/api/test', (_req, res) => {
  res.json({
    success: true,
    message: 'Lead Manager API is working!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
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

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Function to ensure system user exists
const ensureSystemUser = async (): Promise<void> => {
  try {
    const systemUser = await User.findOne({ email: 'system@leadmanager.com' });
    
    if (!systemUser) {
      console.log('🔧 Creating system user...');
      await User.create({
        name: 'System',
        email: 'system@leadmanager.com',
        password: 'system123456', // let pre-save hook hash it
        role: 'admin',
        isActive: true
      });
      console.log('✅ System user created successfully');
    } else {
      console.log('✅ System user already exists');
    }
  } catch (error) {
    console.error('❌ Failed to ensure system user exists:', error);
  }
};

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  console.log(`📴 Received ${signal}, shutting down gracefully`);
  
  // Close server
  server.close((err: Error | undefined) => {
    if (err) {
      console.error('❌ Error during server close:', err);
      process.exit(1);
    }
    
    console.log('📴 HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const startServer = async (): Promise<any> => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Ensure system user exists
    await ensureSystemUser();

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 API Base URL: http://localhost:${PORT}${process.env.API_PREFIX || '/api'}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧪 Test Endpoint: http://localhost:${PORT}/api/test`);
      }
    });

    // Set keep-alive timeout
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
let server: any;
startServer().then((s) => {
  server = s;
});

export default app;
