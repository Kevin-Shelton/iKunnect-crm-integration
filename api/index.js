const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hello World!', 
    timestamp: new Date().toISOString(),
    status: 'working'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Chat session endpoint
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

// Chat thread endpoint
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

// Send message endpoint
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

// Bot process endpoint
app.post('/api/bot/process', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Simple bot responses
    let response = "Thank you for your message! I'm working correctly now.";
    let action = "acknowledged";
    let confidence = 0.8;

    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      response = "Hello! Great to see the integration is working!";
      action = "greeting";
      confidence = 0.9;
    } else if (message.toLowerCase().includes('help')) {
      response = "I'm here to help! The API is now functioning properly.";
      action = "help_request";
      confidence = 0.85;
    } else if (message.toLowerCase().includes('test')) {
      response = "Test successful! The chat integration is working perfectly.";
      action = "test_response";
      confidence = 0.95;
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

// Root API endpoint - ONLY for /api path
app.get('/api', (req, res) => {
  res.json({
    name: 'iKunnect CRM Integration API',
    version: '1.0.0',
    description: 'Working JavaScript API for chat integration',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      hello: 'GET /api/hello',
      chatSession: 'POST /api/chat/session',
      chatThread: 'POST /api/chat/thread',
      chatSend: 'POST /api/chat/send',
      botProcess: 'POST /api/bot/process'
    }
  });
});

// 404 handler - ONLY for /api/* paths
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/hello', 
      'POST /api/chat/session',
      'POST /api/chat/thread',
      'POST /api/chat/send',
      'POST /api/bot/process'
    ]
  });
});

module.exports = app;

