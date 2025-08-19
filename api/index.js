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
      'Version': '2021-04-15'
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
    // Special handling for duplicate contact error
    if (response.status === 400 && responseData.message && responseData.message.includes('duplicated contacts')) {
      // Return the error with contact ID so we can use the existing contact
      const duplicateError = new Error(`Duplicate contact: ${responseData.message}`);
      duplicateError.isDuplicate = true;
      duplicateError.existingContactId = responseData.meta?.contactId;
      duplicateError.matchingField = responseData.meta?.matchingField;
      throw duplicateError;
    }
    
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

// Real GoHighLevel chat session endpoint with duplicate contact handling
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
      console.log('[GHL] Found existing contact by email:', contact?.id);
    } catch (searchError) {
      console.log('[GHL] Contact search by email failed, will try to create new:', searchError.message);
    }
    
    // If no existing contact found, try to create new one
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

      try {
        const createData = await callGHLAPI('contacts/', 'POST', contactData);
        contact = createData.contact;
        isNewContact = true;
        console.log('[GHL] Created new contact:', contact?.id);
      } catch (createError) {
        // Handle duplicate contact error
        if (createError.isDuplicate && createError.existingContactId) {
          console.log('[GHL] Duplicate contact detected, using existing contact:', createError.existingContactId);
          
          // Get the existing contact details
          try {
            const existingContactData = await callGHLAPI(`contacts/${createError.existingContactId}`);
            contact = existingContactData.contact;
            isNewContact = false;
            
            // Update the existing contact with new information if needed
            const updateData = {
              firstName: firstName,
              lastName: lastName,
              email: email,
              source: 'iKunnect Chat Widget - Updated',
              tags: ['Vercel Deployment', 'Live Chat', 'Web Visitor', 'Returning Visitor']
            };
            
            try {
              await callGHLAPI(`contacts/${contact.id}`, 'PUT', updateData);
              console.log('[GHL] Updated existing contact with new info');
            } catch (updateError) {
              console.log('[GHL] Could not update existing contact:', updateError.message);
            }
            
          } catch (fetchError) {
            throw new Error(`Could not fetch existing contact: ${fetchError.message}`);
          }
        } else {
          throw createError;
        }
      }
    }
    
    if (!contact || !contact.id) {
      throw new Error('Failed to create or find contact');
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
        console.log('[GHL] Found existing conversation:', conversation.id);
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
      console.log('[GHL] Created new conversation:', conversation.id);
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

// CUSTOMER MESSAGE - Send to GoHighLevel and let Conversation AI handle it
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

    // Send customer message to GoHighLevel
    // GoHighLevel's Conversation AI will automatically respond if configured
    const messageData = {
      type: 'Live_Chat',
      message: body,
      contactId: contactId,
      conversationId: conversationId
    };

    const messageResponse = await callGHLAPI('conversations/messages', 'POST', messageData);
    
    const messageId = messageResponse.messageId || 
                     messageResponse.message?.id || 
                     messageResponse.id || 
                     'message_created';
    
    console.log('[Customer Message] Sent to GoHighLevel - AI will respond automatically');
    
    res.json({
      success: true,
      data: {
        messageId: messageId,
        conversationId: conversationId,
        contactId: contactId,
        body: body,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        note: 'Message sent to GoHighLevel. Conversation AI will respond automatically if enabled.'
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

// Legacy bot endpoint for backward compatibility - returns success but does nothing
// Frontend should stop calling this endpoint
app.post('/api/bot/process', (req, res) => {
  res.json({
    success: true,
    data: {
      response: "This endpoint is deprecated. GoHighLevel Conversation AI handles responses automatically.",
      action: "deprecated",
      confidence: 1.0,
      timestamp: new Date().toISOString(),
      note: "Please update your frontend to remove calls to this endpoint."
    }
  });
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
    version: '16.0.0',
    description: 'Fixed duplicate contact handling and removed hardcoded bot responses',
    status: 'operational',
    timestamp: new Date().toISOString(),
    note: 'GoHighLevel Conversation AI handles all responses automatically',
    endpoints: {
      health: 'GET /api/health',
      ghlTest: 'GET /api/ghl-test',
      chatSession: 'POST /api/chat/session (handles duplicate contacts)',
      chatThread: 'POST /api/chat/thread',
      chatSend: 'POST /api/chat/send (GoHighLevel AI responds automatically)',
      botProcess: 'POST /api/bot/process (deprecated - returns success for compatibility)'
    },
    requirements: {
      ghl_setup: 'Conversation AI must be enabled and configured in GoHighLevel',
      ai_mode: 'Set Conversation AI to Auto-Pilot mode for automatic responses',
      channels: 'Live_Chat channel must be enabled for the Conversation AI bot'
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

