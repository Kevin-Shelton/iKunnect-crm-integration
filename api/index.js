import express from 'express';
import cors from 'cors';

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint working!',
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasCrmUrl: !!process.env.CRM_MCP_URL,
      hasCrmPit: !!process.env.CRM_PIT,
      hasCrmLocationId: !!process.env.CRM_LOCATION_ID
    }
  });
});

// Basic chat session endpoint (simplified for testing)
app.post('/api/chat/session', (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    res.json({
      success: true,
      message: 'Chat session created successfully!',
      data: {
        contactId: `contact-${Date.now()}`,
        isNewContact: true,
        contact: {
          name: name,
          email: email,
          phone: phone || null
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Basic chat thread endpoint
app.post('/api/chat/thread', (req, res) => {
  try {
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID is required'
      });
    }

    res.json({
      success: true,
      message: 'Conversation thread created!',
      data: {
        conversationId: `conv-${Date.now()}`,
        isNewConversation: true,
        contactId: contactId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Basic send message endpoint
app.post('/api/chat/send', (req, res) => {
  try {
    const { conversationId, body } = req.body;
    
    if (!conversationId || !body) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and message body are required'
      });
    }

    res.json({
      success: true,
      message: 'Message sent successfully!',
      data: {
        messageId: `msg-${Date.now()}`,
        conversationId: conversationId,
        body: body,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Basic bot process endpoint
app.post('/api/bot/process', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Simple bot responses for testing
    let response = "Thank you for your message! I'm a test bot.";
    let action = "acknowledged";
    let confidence = 0.8;

    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      response = "Hello! How can I help you today?";
      action = "greeting";
      confidence = 0.9;
    } else if (message.toLowerCase().includes('help')) {
      response = "I'm here to help! What do you need assistance with?";
      action = "help_request";
      confidence = 0.85;
    } else if (message.toLowerCase().includes('price') || message.toLowerCase().includes('cost')) {
      response = "I'd be happy to help you with pricing information. Let me connect you with our sales team.";
      action = "pricing_inquiry";
      confidence = 0.9;
    }

    res.json({
      success: true,
      data: {
        response: response,
        action: action,
        confidence: confidence,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'iKunnect-CRM Integration API',
    version: '1.0.0',
    description: 'Simplified API for testing',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      chatSession: 'POST /api/chat/session',
      chatThread: 'POST /api/chat/thread',
      chatSend: 'POST /api/chat/send',
      botProcess: 'POST /api/bot/process'
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

export default app;

