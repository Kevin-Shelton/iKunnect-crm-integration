import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createCRMClient } from './lib/ghlMcp';
import { errorHandler } from './middleware/errorHandler';
import { securityMiddleware, rateLimitMiddleware } from './middleware/security';
import chatRoutes from './routes/chat';
import botRoutes from './routes/bot';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
app.use(rateLimitMiddleware);

// Request logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security validation
app.use(securityMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test CRM connectivity
    const crmClient = createCRMClient();
    const crmHealth = await crmClient.healthCheck();
    
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      crm: crmHealth.success ? 'connected' : 'disconnected',
      crmDetails: crmHealth.success ? 'CRM API connection successful' : `CRM API Error: ${crmHealth.error}`
    };

    const statusCode = crmHealth.success ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('[Health Check] Error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      crm: 'error',
      crmDetails: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API information endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'iKunnect-CRM Integration API',
    version: '1.0.0',
    description: 'RESTful API for integrating iKunnect chat widgets with CRM system via MCP',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      chat: {
        createSession: 'POST /chat/session',
        createThread: 'POST /chat/thread',
        sendMessage: 'POST /chat/send',
        getMessages: 'GET /chat/messages/:conversationId',
        searchContact: 'POST /chat/contact/search'
      },
      bot: {
        process: 'POST /bot/process',
        autoRespond: 'POST /bot/auto-respond'
      }
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// API Routes
app.use('/chat', chatRoutes);
app.use('/bot', botRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 iKunnect-CRM Integration API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`📚 API Info: http://localhost:${PORT}/`);
  
  // Log CRM configuration (without sensitive data)
  console.log(`🔧 CRM MCP URL: ${process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/'}`);
  console.log(`🏢 CRM Location ID: ${process.env.CRM_LOCATION_ID ? '***configured***' : '***missing***'}`);
  console.log(`🔑 CRM PIT: ${process.env.CRM_PIT ? '***configured***' : '***missing***'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

export default app;

