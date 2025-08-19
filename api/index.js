const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to make CRM API calls
async function callCRMAPI(endpoint, method = 'GET', data = null) {
  const fetch = require('node-fetch');
  
  const baseUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/';
  const url = `${baseUrl}${endpoint}`;
  
  const options = {
    method: method,
    headers: {
      'Authorization': `Bearer ${process.env.CRM_PIT}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  console.log(`[CRM API] ${method} ${url}`, data ? JSON.stringify(data, null, 2) : '');
  
  const response = await fetch(url, options);
  const responseData = await response.json();
  
  console.log(`[CRM API Response] ${response.status}:`, JSON.stringify(responseData, null, 2));
  
  if (!response.ok) {
    throw new Error(`CRM API Error: ${response.status} - ${JSON.stringify(responseData)}`);
  }
  
  return responseData;
}

// Health check with CRM connection test
app.get('/api/health', async (req, res) => {
  try {
    // Test CRM connection
    const locationResponse = await callCRMAPI(`locations/${process.env.CRM_LOCATION_ID}`);
    
    res.json({
      success: true,
      message: 'API is healthy and CRM is connected',
      timestamp: new Date().toISOString(),
      crm: {
        connected: true,
        locationName: locationResponse.location?.name || 'Unknown',
        locationId: process.env.CRM_LOCATION_ID
      }
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'API is running but CRM connection failed',
      timestamp: new Date().toISOString(),
      error: error.message,
      crm: {
        connected: false,
        mcpUrl: process.env.CRM_MCP_URL ? 'configured' : 'missing',
        token: process.env.CRM_PIT ? 'configured' : 'missing',
        locationId: process.env.CRM_LOCATION_ID ? 'configured' : 'missing'
      }
    });
  }
});

// Real CRM chat session endpoint
app.post('/api/chat/session', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // First, try to find existing contact by email
    let contact = null;
    let isNewContact = false;
    
    try {
      const searchResponse = await callCRMAPI(`contacts/search/duplicate?locationId=${process.env.CRM_LOCATION_ID}&email=${encodeURIComponent(email)}`);
      contact = searchResponse.contact;
    } catch (searchError) {
      console.log('[CRM] Contact search failed, will create new:', searchError.message);
    }
    
    // If no existing contact found, create new one
    if (!contact) {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const contactData = {
        firstName: firstName,
        lastName: lastName,
        name: name,
        email: email,
        phone: phone || '',
        locationId: process.env.CRM_LOCATION_ID,
        source: 'iKunnect Chat Widget',
        tags: ['Vercel Deployment', 'Live Chat', 'Web Visitor']
      };

      const createResponse = await callCRMAPI('contacts', 'POST', contactData);
      contact = createResponse.contact;
      isNewContact = true;
    }
    
    res.json({
      success: true,
      data: {
        contactId: contact.id,
        isNewContact: isNewContact,
        contact: {
          id: contact.id,
          name: contact.name || name,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone
        }
      }
    });
    
  } catch (error) {
    console.error('[CRM Session Error]:', error);
    res.status(500).json({
      success: false,
      error: `CRM integration failed: ${error.message}`,
      details: 'Check your CRM credentials and try again'
    });
  }
});

// Real CRM conversation thread endpoint
app.post('/api/chat/thread', async (req, res) => {
  try {
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID is required'
      });
    }

    // Check for existing conversation
    let conversation = null;
    let isNewConversation = false;
    
    try {
      const conversationsResponse = await callCRMAPI(`conversations/search?contactId=${contactId}&locationId=${process.env.CRM_LOCATION_ID}`);
      const conversations = conversationsResponse.conversations || [];
      
      // Find the most recent conversation
      if (conversations.length > 0) {
        conversation = conversations[0];
      }
    } catch (searchError) {
      console.log('[CRM] Conversation search failed, will create new:', searchError.message);
    }
    
    // If no existing conversation, create new one
    if (!conversation) {
      const conversationData = {
        locationId: process.env.CRM_LOCATION_ID,
        contactId: contactId,
        type: 'Chat',
        inbox: 'chat'
      };

      const createResponse = await callCRMAPI('conversations', 'POST', conversationData);
      conversation = createResponse.conversation;
      isNewConversation = true;
    }
    
    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        isNewConversation: isNewConversation,
        contactId: contactId,
        conversation: {
          id: conversation.id,
          type: conversation.type,
          status: conversation.status
        }
      }
    });
    
  } catch (error) {
    console.error('[CRM Thread Error]:', error);
    res.status(500).json({
      success: false,
      error: `CRM conversation creation failed: ${error.message}`,
      details: 'Check your CRM credentials and contact ID'
    });
  }
});

// Real CRM message sending endpoint
app.post('/api/chat/send', async (req, res) => {
  try {
    const { conversationId, body } = req.body;
    
    if (!conversationId || !body) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and message body are required'
      });
    }

    const messageData = {
      type: 'Chat',
      body: body,
      direction: 'inbound',
      status: 'delivered',
      conversationId: conversationId,
      locationId: process.env.CRM_LOCATION_ID
    };

    const messageResponse = await callCRMAPI('conversations/messages', 'POST', messageData);
    
    res.json({
      success: true,
      data: {
        messageId: messageResponse.message?.id || messageResponse.id,
        conversationId: conversationId,
        body: body,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        direction: 'inbound'
      }
    });
    
  } catch (error) {
    console.error('[CRM Send Error]:', error);
    res.status(500).json({
      success: false,
      error: `CRM message sending failed: ${error.message}`,
      details: 'Check your conversation ID and try again'
    });
  }
});

// Enhanced bot process endpoint with CRM context
app.post('/api/bot/process', async (req, res) => {
  try {
    const { message, contactId, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Get contact info for personalized responses
    let contactInfo = null;
    if (contactId) {
      try {
        const contactResponse = await callCRMAPI(`contacts/${contactId}`);
        contactInfo = contactResponse.contact;
      } catch (error) {
        console.log('[Bot] Could not fetch contact info:', error.message);
      }
    }

    // Enhanced bot logic with CRM context
    let response = `Thank you for your message${contactInfo?.firstName ? `, ${contactInfo.firstName}` : ''}! I'm your AI assistant and I'm connected to the CRM system.`;
    let action = "acknowledged";
    let confidence = 0.8;

    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = `Hello${contactInfo?.firstName ? ` ${contactInfo.firstName}` : ''}! Welcome to our chat system. Your information is now in our CRM and I'm here to help you.`;
      action = "greeting";
      confidence = 0.9;
    } else if (lowerMessage.includes('help')) {
      response = "I'm here to help! I can assist you with questions about our services. Your conversation is being tracked in our CRM system for better support.";
      action = "help_request";
      confidence = 0.85;
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
      response = "I'd be happy to help you with pricing information. Let me connect you with our sales team who can provide detailed pricing based on your needs.";
      action = "pricing_inquiry";
      confidence = 0.9;
    } else if (lowerMessage.includes('demo') || lowerMessage.includes('trial')) {
      response = "Great! I can help you schedule a demo. Your interest has been noted in our CRM system and someone from our team will reach out to you soon.";
      action = "demo_request";
      confidence = 0.95;
    }

    // Send bot response back to CRM as outbound message
    if (conversationId) {
      try {
        const botMessageData = {
          type: 'Chat',
          body: response,
          direction: 'outbound',
          status: 'delivered',
          conversationId: conversationId,
          locationId: process.env.CRM_LOCATION_ID
        };
        
        await callCRMAPI('conversations/messages', 'POST', botMessageData);
      } catch (error) {
        console.log('[Bot] Could not send response to CRM:', error.message);
      }
    }

    res.json({
      success: true,
      data: {
        response: response,
        action: action,
        confidence: confidence,
        timestamp: new Date().toISOString(),
        contactInfo: contactInfo ? {
          name: contactInfo.name,
          firstName: contactInfo.firstName
        } : null
      }
    });
    
  } catch (error) {
    console.error('[Bot Process Error]:', error);
    res.json({
      success: true,
      data: {
        response: "I'm experiencing some technical difficulties, but your message has been received and logged.",
        action: "error_fallback",
        confidence: 0.5,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

// Test endpoint to verify CRM connection
app.get('/api/crm-test', async (req, res) => {
  try {
    const locationResponse = await callCRMAPI(`locations/${process.env.CRM_LOCATION_ID}`);
    
    res.json({
      success: true,
      message: 'CRM connection successful!',
      location: {
        id: locationResponse.location?.id,
        name: locationResponse.location?.name,
        website: locationResponse.location?.website
      },
      credentials: {
        mcpUrl: process.env.CRM_MCP_URL,
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      credentials: {
        mcpUrl: process.env.CRM_MCP_URL ? 'configured' : 'missing',
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID ? 'configured' : 'missing'
      }
    });
  }
});

// Keep existing endpoints
app.get('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hello World!', 
    timestamp: new Date().toISOString(),
    status: 'working'
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'iKunnect CRM Integration API',
    version: '2.0.0',
    description: 'Full CRM integration with GoHighLevel',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      crmTest: 'GET /api/crm-test',
      chatSession: 'POST /api/chat/session',
      chatThread: 'POST /api/chat/thread',
      chatSend: 'POST /api/chat/send',
      botProcess: 'POST /api/bot/process'
    }
  });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

module.exports = app;

