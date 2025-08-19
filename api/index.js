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

// Helper function to get assigned agent name
async function getAssignedAgentName(conversationId) {
  try {
    // Get conversation details to find assignedTo
    const conversationData = await callGHLAPI(`conversations/${conversationId}`);
    const assignedTo = conversationData.conversation?.assignedTo;
    
    if (!assignedTo) {
      return null; // No agent assigned
    }
    
    // Get user details to get the agent's name
    const userData = await callGHLAPI(`users/${assignedTo}`);
    const agentName = userData.name || userData.firstName || 'Agent';
    
    return agentName;
  } catch (error) {
    console.log('[Agent Name] Could not fetch assigned agent:', error.message);
    return null;
  }
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
        type: 'Live_Chat'  // Live chat type for proper display
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
          status: conversation.status,
          assignedTo: conversation.assignedTo
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

// Fixed message sending endpoint with better error handling
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

    // Create message with Live_Chat type
    const messageData = {
      type: 'Live_Chat',
      message: body,
      direction: 'inbound',
      status: 'delivered',
      conversationId: conversationId,
      contactId: contactId,
      locationId: process.env.CRM_LOCATION_ID
    };

    const messageResponse = await callGHLAPI('conversations/messages', 'POST', messageData);
    
    // Better handling of message response structure
    const messageId = messageResponse.messageId || 
                     messageResponse.message?.id || 
                     messageResponse.id || 
                     'message_created';
    
    res.json({
      success: true,
      data: {
        messageId: messageId,
        conversationId: conversationId,
        contactId: contactId,
        body: body,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        direction: 'inbound',
        fullResponse: messageResponse // Debug info
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

// Enhanced bot process endpoint with real agent name detection
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

    // Get assigned agent name from conversation
    let agentName = 'your assistant';
    if (conversationId) {
      const assignedAgentName = await getAssignedAgentName(conversationId);
      if (assignedAgentName) {
        agentName = assignedAgentName;
      }
    }

    // Intelligent bot logic with real agent name
    let response = '';
    let action = '';
    let confidence = 0.8;

    const lowerMessage = message.toLowerCase();
    const firstName = contactInfo?.firstName || 'there';
    
    // Greeting responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      response = `Hello ${firstName}! I'm ${agentName} from iKunnect. I'm here to help you with any questions about our services. What can I assist you with today?`;
      action = "greeting";
      confidence = 0.95;
    }
    
    // Name questions - Use real agent name
    else if (lowerMessage.includes('name') || lowerMessage.includes('who are you')) {
      response = `Hi ${firstName}! I'm ${agentName}, your assigned agent at iKunnect. I'm here to help you with our contact center platform and services. What would you like to know?`;
      action = "introduction";
      confidence = 0.9;
    }
    
    // Company/business questions
    else if (lowerMessage.includes('company') || lowerMessage.includes('business') || lowerMessage.includes('what do you do') || lowerMessage.includes('services')) {
      response = `Great question, ${firstName}! I'm ${agentName} and I work for iKunnect, a comprehensive contact center platform (CCaaS). We help businesses manage customer communications through live chat widgets, phone systems, CRM integration, and AI-powered customer service solutions. We're powered by OneMeta technology and specialize in improving customer experience. Would you like to know more about any specific service?`;
      action = "company_info";
      confidence = 0.95;
    }
    
    // Help requests
    else if (lowerMessage.includes('help') || lowerMessage.includes('assist') || lowerMessage.includes('support')) {
      response = `I'm here to help, ${firstName}! I'm ${agentName}, and I can assist you with information about our contact center solutions, live chat services, CRM integrations, or answer any questions about iKunnect. What specific area would you like to know more about?`;
      action = "help_request";
      confidence = 0.9;
    }
    
    // Legal/lawyer questions (legacy from previous setup)
    else if (lowerMessage.includes('lawyer') || lowerMessage.includes('legal')) {
      response = `I think there might be some confusion, ${firstName}. I'm ${agentName} from iKunnect, which is actually a contact center and customer communication platform, not a legal service. We help businesses manage their customer interactions through live chat, phone systems, and CRM integration. Is there something about our communication services I can help you with?`;
      action = "clarification";
      confidence = 0.85;
    }
    
    // Pricing questions
    else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
      response = `Thanks for your interest in our pricing, ${firstName}! I'm ${agentName}, and I'd love to help you understand our iKunnect platform pricing. We offer flexible pricing based on your business needs. I can connect you with our sales team who can provide detailed pricing information tailored to your requirements. Would you like me to arrange a consultation?`;
      action = "pricing_inquiry";
      confidence = 0.9;
    }
    
    // Demo/consultation requests
    else if (lowerMessage.includes('demo') || lowerMessage.includes('consultation') || lowerMessage.includes('meeting') || lowerMessage.includes('call')) {
      response = `Excellent, ${firstName}! I'm ${agentName}, and I'd be happy to arrange a demo or consultation for you. Our team can show you exactly how iKunnect can improve your customer communication workflows. I've noted your interest and someone from our team will reach out to schedule a convenient time. Is there a preferred time of day that works best for you?`;
      action = "demo_request";
      confidence = 0.95;
    }
    
    // Features questions
    else if (lowerMessage.includes('feature') || lowerMessage.includes('capability') || lowerMessage.includes('can you') || lowerMessage.includes('able to')) {
      response = `Great question, ${firstName}! I'm ${agentName}, and I'm excited to tell you about iKunnect's powerful features: live chat widgets (like this one!), omnichannel communication, CRM integration, AI-powered responses, call center management, and real-time analytics. We're also powered by OneMeta's advanced AI technology. Which specific feature interests you most?`;
      action = "features_inquiry";
      confidence = 0.9;
    }
    
    // Integration questions
    else if (lowerMessage.includes('integrate') || lowerMessage.includes('crm') || lowerMessage.includes('api')) {
      response = `Absolutely, ${firstName}! I'm ${agentName}, and integration is one of our strengths at iKunnect. We integrate seamlessly with popular CRMs like GoHighLevel, Salesforce, HubSpot, and many others. We also offer robust APIs for custom integrations. This chat conversation, for example, is being automatically saved to our CRM system. Would you like to know more about specific integrations?`;
      action = "integration_inquiry";
      confidence = 0.95;
    }
    
    // Default intelligent response
    else {
      response = `Thanks for your message, ${firstName}! I'm ${agentName} from iKunnect, and I want to make sure I give you the most helpful response. Could you tell me a bit more about what you're looking for? Are you interested in our contact center platform, live chat solutions, CRM integrations, or something else? I'm here to help!`;
      action = "clarification_request";
      confidence = 0.7;
    }

    // Send bot response back to GoHighLevel
    if (conversationId && contactId) {
      try {
        const botMessageData = {
          type: 'Live_Chat',
          message: response,
          direction: 'outbound',
          status: 'delivered',
          conversationId: conversationId,
          contactId: contactId,
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
        agentName: agentName,
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
        response: "I'm experiencing some technical difficulties, but your message has been received. Let me try to help you anyway - what can I assist you with today?",
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
    version: '11.0.0',
    description: 'Enhanced GoHighLevel integration with real assigned agent name detection and Live_Chat message type',
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

