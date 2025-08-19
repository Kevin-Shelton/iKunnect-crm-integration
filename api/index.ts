import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import your existing routes
import chatRoutes from '../src/routes/chat';
import botRoutes from '../src/routes/bot';
import { errorHandler } from '../src/middleware/errorHandler';
import { securityMiddleware } from '../src/middleware/security';
import { createCRMClient } from '../src/lib/crmMcp';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.vercel.app', 'https://your-domain.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply security middleware
app.use(securityMiddleware);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test CRM connection
    const crmClient = createCRMClient();
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'iKunnect-CRM Integration API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      crm: {
        connected: !!crmClient,
        mcpUrl: process.env.CRM_MCP_URL ? 'configured' : 'missing',
        token: process.env.CRM_PIT ? 'configured' : 'missing',
        locationId: process.env.CRM_LOCATION_ID ? 'configured' : 'missing'
      }
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

// API routes
app.use('/api/chat', chatRoutes);
app.use('/api/bot', botRoutes);

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'iKunnect-CRM Integration API',
    version: '1.0.0',
    description: 'RESTful API for iKunnect to CRM integration using MCP',
    endpoints: {
      health: '/api/health',
      chat: {
        session: 'POST /api/chat/session',
        thread: 'POST /api/chat/thread', 
        send: 'POST /api/chat/send',
        messages: 'GET /api/chat/messages/:conversationId'
      },
      bot: {
        process: 'POST /api/bot/process',
        autoRespond: 'POST /api/bot/auto-respond'
      }
    },
    documentation: 'https://github.com/Kevin-Shelton/iKunnect-crm-integration',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(errorHandler);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/chat/session',
      'POST /api/chat/thread',
      'POST /api/chat/send',
      'GET /api/chat/messages/:id',
      'POST /api/bot/process',
      'POST /api/bot/auto-respond'
    ]
  });
});

export default app;

