const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to make GoHighLevel REST API calls
async function callGHLAPI(endpoint, method = 'GET', data = null) {
  const fetch = require('node-fetch');
  
  const baseUrl = 'https://services.leadconnectorhq.com/';
  const url = `${baseUrl}${endpoint}`;
  
  const options = {
    method: method,
    headers: {
      'Authorization': `Bearer ${process.env.CRM_PIT}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Version': '2021-07-28'
    }
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  console.log(`[GHL API] ${method} ${url}`, data ? JSON.stringify(data, null, 2) : '');
  
  const response = await fetch(url, options);
  const responseText = await response.text();
  
  console.log(`[GHL API Response] ${response.status}:`, responseText.substring(0, 500));
  
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
  }
  
  if (!response.ok) {
    throw new Error(`GHL API Error: ${response.status} - ${JSON.stringify(responseData)}`);
  }
  
  return responseData;
}

// Health check with GHL REST API
app.get('/api/health', async (req, res) => {
  try {
    const locationData = await callGHLAPI(`locations/${process.env.CRM_LOCATION_ID}`);
    
    res.json({
      success: true,
      message: 'API is healthy and GoHighLevel is connected',
      timestamp: new Date().toISOString(),
      ghl: {
        connected: true,
        locationName: locationData.location?.name || 'Unknown',
        locationId: process.env.CRM_LOCATION_ID,
        companyId: locationData.location?.companyId
      }
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'API is running but GoHighLevel connection failed',
      timestamp: new Date().toISOString(),
      error: error.message,
      ghl: {
        connected: false,
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID
      }
    });
  }
});

// Real GoHighLevel chat session endpoint
app.post('/api/chat/session', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Try to find existing contact by email first
    let contact = null;
    let isNewContact = false;
    
    try {
      const searchData = await callGHLAPI(`contacts/search/duplicate?locationId=${process.env.CRM_LOCATION_ID}&email=${encodeURIComponent(email)}`);
      contact = searchData.contact;
    } catch (searchError) {
      console.log('[GHL] Contact search failed, will create new:', searchError.message);
    }
    
    // If no existing contact found, create new one
    if (!contact) {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const contactData = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone || '',
        locationId: process.env.CRM_LOCATION_ID,
        source: 'iKunnect Chat Widget',
        tags: ['Vercel Deployment', 'Live Chat', 'Web Visitor']
      };

      const createData = await callGHLAPI('contacts/', 'POST', contactData);
      contact = createData.contact;
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
    console.error('[GHL Session Error]:', error);
    res.status(500).json({
      success: false,
      error: `GoHighLevel integration failed: ${error.message}`,
      details: 'Check your GoHighLevel credentials and try again'
    });
  }
});

// Real GoHighLevel conversation thread endpoint
app.post('/api/chat/thread', async (req, res) => {
  try {
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID is required'
      });
    }

    // Check for existing conversations
    let conversation = null;
    let isNewConversation = false;
    
    try {
      const conversationsData = await callGHLAPI(`conversations/search?contactId=${contactId}&locationId=${process.env.CRM_LOCATION_ID}`);
      const conversations = conversationsData.conversations || [];
      
      if (conversations.length > 0) {
        conversation = conversations[0];
      }
    } catch (searchError) {
      console.log('[GHL] Conversation search failed, will create new:', searchError.message);
    }
    
    // If no existing conversation, create new one
    if (!conversation) {
      const conversationData = {
        locationId: process.env.CRM_LOCATION_ID,
        contactId: contactId,
        type: 'Chat'
      };

      const createData = await callGHLAPI('conversations/', 'POST', conversationData);
      conversation = createData.conversation;
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
    console.error('[GHL Thread Error]:', error);
    res.status(500).json({
      success: false,
      error: `GoHighLevel conversation creation failed: ${error.message}`,
      details: 'Check your GoHighLevel credentials and contact ID'
    });
  }
});

// Fixed message sending endpoint with proper contact ID
app.post('/api/chat/send', async (req, res) => {
  try {
    const { conversationId, body, contactId } = req.body;
    
    if (!conversationId || !body) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and message body are required'
      });
    }

    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID is required for message sending'
      });
    }

    // Create message with all required fields
    const messageData = {
      type: 'Chat',
      body: body,
      direction: 'inbound',
      status: 'delivered',
      conversationId: conversationId,
      contactId: contactId,  // This was missing!
      locationId: process.env.CRM_LOCATION_ID
    };

    const messageResponse = await callGHLAPI('conversations/messages', 'POST', messageData);
    
    res.json({
      success: true,
      data: {
        messageId: messageResponse.message?.id || messageResponse.id,
        conversationId: conversationId,
        contactId: contactId,
        body: body,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        direction: 'inbound'
      }
    });
    
  } catch (error) {
    console.error('[GHL Send Error]:', error);
    res.status(500).json({
      success: false,
      error: `GoHighLevel message sending failed: ${error.message}`,
      details: 'Check your conversation ID and contact ID'
    });
  }
});

// Enhanced bot process endpoint with proper message creation
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
        const contactData = await callGHLAPI(`contacts/${contactId}`);
        contactInfo = contactData.contact;
      } catch (error) {
        console.log('[Bot] Could not fetch contact info:', error.message);
      }
    }

    // Enhanced bot logic with personalization
    let response = `Thank you for your message${contactInfo?.firstName ? `, ${contactInfo.firstName}` : ''}! I'm your AI assistant and your information has been saved to our CRM.`;
    let action = "acknowledged";
    let confidence = 0.8;

    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = `Hello${contactInfo?.firstName ? ` ${contactInfo.firstName}` : ''}! Welcome to National Lawyers Guild NYC. Your information is now in our system and I'm here to help you.`;
      action = "greeting";
      confidence = 0.9;
    } else if (lowerMessage.includes('help')) {
      response = "I'm here to help! I can assist you with questions about our legal services. Your conversation is being tracked for better support.";
      action = "help_request";
      confidence = 0.85;
    } else if (lowerMessage.includes('lawyer') || lowerMessage.includes('legal')) {
      response = "Great! You're interested in our legal services. I've noted this in your profile and someone from our legal team will reach out to you soon.";
      action = "legal_inquiry";
      confidence = 0.9;
    } else if (lowerMessage.includes('consultation') || lowerMessage.includes('meeting')) {
      response = "I'd be happy to help you schedule a consultation. Your interest has been noted and someone will contact you to arrange a meeting.";
      action = "consultation_request";
      confidence = 0.95;
    }

    // Send bot response back to GoHighLevel with proper contact ID
    if (conversationId && contactId) {
      try {
        const botMessageData = {
          type: 'Chat',
          body: response,
          direction: 'outbound',
          status: 'delivered',
          conversationId: conversationId,
          contactId: contactId,  // Include contact ID
          locationId: process.env.CRM_LOCATION_ID
        };
        
        await callGHLAPI('conversations/messages', 'POST', botMessageData);
      } catch (error) {
        console.log('[Bot] Could not send response to GoHighLevel:', error.message);
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
        response: "I'm experiencing some technical difficulties, but your message has been received.",
        action: "error_fallback",
        confidence: 0.5,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

// Test endpoint to verify GoHighLevel connection
app.get('/api/ghl-test', async (req, res) => {
  try {
    const locationData = await callGHLAPI(`locations/${process.env.CRM_LOCATION_ID}`);
    
    res.json({
      success: true,
      message: 'GoHighLevel connection successful!',
      location: {
        id: locationData.location?.id,
        name: locationData.location?.name,
        website: locationData.location?.website,
        companyId: locationData.location?.companyId
      },
      credentials: {
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      credentials: {
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID
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
    name: 'iKunnect GoHighLevel Integration API',
    version: '7.0.0',
    description: 'GoHighLevel integration with proper contact ID handling',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      ghlTest: 'GET /api/ghl-test',
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

