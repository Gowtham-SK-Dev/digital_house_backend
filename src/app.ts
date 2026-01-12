import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from '@config/config';
import { PostgresDB, MongoDB, MySQLDB } from '@config/database';
import { authMiddleware, errorHandler } from '@middleware/auth';
import { ApiResponseHandler } from '@utils/apiResponse';
import { ChatService } from '@services/chat.service';

// Import routes
import authRoutes from '@routes/auth';
import userRoutes from '@routes/users';
import postRoutes from '@routes/posts';
import chatRoutes from '@routes/chat';

export const createApp = (): { app: Express; httpServer: any; chatService: ChatService } => {
  const app = express();
  const httpServer = createServer(app);
  const chatService = new ChatService(httpServer);

  // Middleware - Security
  app.use(helmet());
  app.use(
    cors({
      origin: config.socketIO.corsOrigin,
      credentials: true,
    })
  );

  // Middleware - Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Middleware - Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    ApiResponseHandler.success(res, { status: 'OK', timestamp: new Date() }, 'Server is healthy');
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', authMiddleware, userRoutes);
  app.use('/api/posts', authMiddleware, postRoutes);
  app.use('/api/chat', authMiddleware, chatRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    ApiResponseHandler.error(res, 'Route not found', 404);
  });

  // Error Handler
  app.use(errorHandler);

  return { app, httpServer, chatService };
};

export const startServer = async (): Promise<void> => {
  const { app, httpServer, chatService } = createApp();

  try {
    // Initialize databases
    console.log('Connecting to databases...');
    
    // Try MySQL (primary database)
    try {
      await MySQLDB.connect();
    } catch (error) {
      console.warn('⚠ MySQL connection failed - running in mock mode');
    }
    
    // Try MongoDB (optional for real-time features)
    try {
      await MongoDB.connect();
    } catch (error) {
      console.warn('⚠ MongoDB connection failed - some real-time features may not work');
    }
    
    // PostgreSQL is optional
    try {
      await PostgresDB.connect();
    } catch (error) {
      console.warn('⚠ PostgreSQL connection failed - using MySQL/mock as primary database');
    }

    // Start server
    httpServer.listen(config.port, () => {
      console.log(`\n🚀 Digital House Server running on port ${config.port}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`✓ Socket.io server initialized`);
      console.log(`✓ Connected users: 0`);
      console.log(`\nTo test: curl http://localhost:${config.port}/health\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await PostgresDB.disconnect();
  await MongoDB.disconnect();
  await MySQLDB.disconnect();
  process.exit(0);
});
