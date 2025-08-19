const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to make GoHighLevel MCP Server calls with correct headers
async function callGHLMCP(tool, input) {
  const fetch = require('node-fetch');
  
  const url = 'https://services.leadconnectorhq.com/mcp/';
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRM_PIT}`,
      'locationId': process.env.CRM_LOCATION_ID,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'  // Fixed: Include both required Accept types
    },
    body: JSON.stringify({
      tool: tool,
      input: input
    })
  };
  
  console.log(`[GHL MCP] Calling tool: ${tool}`, JSON.stringify(input, null, 2));
  
  const response = await fetch(url, options);
  const responseText = await response.text();
  
  console.log(`[GHL MCP Response] ${response.status}:`, responseText.substring(0, 500));
  
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
  }
  
  if (!response.ok) {
    throw new Error(`GHL MCP Error: ${response.status} - ${JSON.stringify(responseData)}`);
  }
  
  return responseData;
}

// Health check with GHL MCP Server
app.get('/api/health', async (req, res) => {
  try {
    const locationData = await callGHLMCP('locations_get-location', {
      locationId: process.env.CRM_LOCATION_ID
    });
    
    res.json({
      success: true,
      message: 'API is healthy and GoHighLevel MCP is connected',
      timestamp: new Date().toISOString(),
      ghl: {
        connected: true,
        locationName: locationData.name || 'Unknown',
        locationId: process.env.CRM_LOCATION_ID,
        mcpServer: 'https://services.leadconnectorhq.com/mcp/'
      }
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'API is running but GoHighLevel MCP connection failed',
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

// Create or find contact using MCP Server
app.post('/api/chat/session', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    let contact = null;
    let isNewContact = false;
    
    try {
      // Try to upsert contact (create or update if exists)
      const contactData = await callGHLMCP('contacts_upsert-contact', {
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone || '',
        source: 'iKunnect Live Chat Widget',
        tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
      });
      
      contact = contactData.contact;
      isNewContact = contactData.isNew || false;
      console.log('[GHL MCP] Contact upserted:', contact?.id);
      
    } catch (error) {
      console.error('[GHL MCP] Contact upsert failed:', error.message);
      throw error;
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
    console.error('[GHL MCP Session Error]:', error);
    res.status(500).json({
      success: false,
      error: `GoHighLevel MCP integration failed: ${error.message}`,
      details: 'Check your GoHighLevel MCP credentials and try again'
    });
  }
});

// Find or create conversation using MCP Server
app.post('/api/chat/thread', async (req, res) => {
  try {
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID is required'
      });
    }

    let conversation = null;
    let isNewConversation = false;
    
    try {
      // Search for existing conversations for this contact
      const searchData = await callGHLMCP('conversations_search-conversation', {
        contactId: contactId,
        locationId: process.env.CRM_LOCATION_ID
      });
      
      const conversations = searchData.conversations || [];
      
      // Look for existing Live Chat conversation
      const liveChatConversation = conversations.find(conv => 
        conv.type === 'Live_Chat' || 
        conv.type === 'LiveChat' || 
        conv.type === 'WebChat'
      );
      
      if (liveChatConversation) {
        conversation = liveChatConversation;
        console.log('[GHL MCP] Found existing Live Chat conversation:', conversation.id);
      } else if (conversations.length > 0) {
        // Use the first conversation if no Live Chat specific one found
        conversation = conversations[0];
        console.log('[GHL MCP] Using existing conversation:', conversation.id);
      }
      
    } catch (searchError) {
      console.log('[GHL MCP] Conversation search failed:', searchError.message);
    }
    
    // If no conversation found, we'll create one when sending the first message
    // The MCP server doesn't have a direct conversation creation tool
    if (!conversation) {
      // We'll use a placeholder conversation ID and create it with the first message
      conversation = {
        id: `pending_${contactId}_${Date.now()}`,
        type: 'Live_Chat',
        status: 'pending'
      };
      isNewConversation = true;
      console.log('[GHL MCP] Will create conversation with first message');
    }
    
    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        isNewConversation: isNewConversation,
        contactId: contactId,
        conversation: {
          id: conversation.id,
          type: conversation.type || 'Live_Chat',
          status: conversation.status,
          assignedTo: conversation.assignedTo
        }
      }
    });
    
  } catch (error) {
    console.error('[GHL MCP Thread Error]:', error);
    res.status(500).json({
      success: false,
      error: `GoHighLevel MCP conversation search failed: ${error.message}`,
      details: 'Check your GoHighLevel MCP credentials and contact ID'
    });
  }
});

// Send message using MCP Server - this should create Live Chat properly
app.post('/api/chat/send', async (req, res) => {
  try {
    const { conversationId, body, contactId } = req.body;
    
    if (!body || !contactId) {
      return res.status(400).json({
        success: false,
        error: 'Message body and contact ID are required'
      });
    }

    try {
      // Use the MCP Server to send a new message
      // This should automatically create the conversation as Live Chat if it doesn't exist
      const messageData = await callGHLMCP('conversations_send-a-new-message', {
        contactId: contactId,
        message: body,
        type: 'Live_Chat'  // Specify Live Chat type
      });
      
      console.log('[GHL MCP] Message sent successfully:', messageData);
      
      const messageId = messageData.messageId || 
                       messageData.message?.id || 
                       messageData.id || 
                       'message_created';
      
      const actualConversationId = messageData.conversationId || 
                                  messageData.conversation?.id || 
                                  conversationId;
      
      res.json({
        success: true,
        data: {
          messageId: messageId,
          conversationId: actualConversationId,
          contactId: contactId,
          body: body,
          timestamp: new Date().toISOString(),
          status: 'delivered',
          messageType: 'Live_Chat',
          note: 'Message sent via GoHighLevel MCP Server - should appear as Live Chat'
        }
      });
      
    } catch (mcpError) {
      console.error('[GHL MCP Send Error]:', mcpError);
      throw mcpError;
    }
    
  } catch (error) {
    console.error('[GHL MCP Send Error]:', error);
    res.status(500).json({
      success: false,
      error: `GoHighLevel MCP message sending failed: ${error.message}`,
      details: 'Check your conversation ID and contact ID'
    });
  }
});

// Legacy bot endpoint for backward compatibility
app.post('/api/bot/process', (req, res) => {
  res.json({
    success: true,
    data: {
      response: "This endpoint is deprecated. GoHighLevel Conversation AI handles responses automatically via MCP Server.",
      action: "deprecated",
      confidence: 1.0,
      timestamp: new Date().toISOString(),
      note: "Messages are now sent via GoHighLevel MCP Server for proper Live Chat integration."
    }
  });
});

// Test MCP Server connection
app.get('/api/ghl-test', async (req, res) => {
  try {
    const locationData = await callGHLMCP('locations_get-location', {
      locationId: process.env.CRM_LOCATION_ID
    });
    
    res.json({
      success: true,
      message: 'GoHighLevel MCP Server connection successful!',
      location: {
        id: locationData.id,
        name: locationData.name,
        website: locationData.website,
        companyId: locationData.companyId
      },
      mcp: {
        endpoint: 'https://services.leadconnectorhq.com/mcp/',
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      mcp: {
        endpoint: 'https://services.leadconnectorhq.com/mcp/',
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
    name: 'iKunnect GoHighLevel MCP Integration API',
    version: '19.0.0',
    description: 'Fixed MCP Server headers - using proper Accept headers for GoHighLevel MCP',
    status: 'operational',
    timestamp: new Date().toISOString(),
    note: 'Now using correct Accept headers: application/json, text/event-stream',
    endpoints: {
      health: 'GET /api/health (MCP Server health check)',
      ghlTest: 'GET /api/ghl-test (MCP Server connection test)',
      chatSession: 'POST /api/chat/session (MCP contacts_upsert-contact)',
      chatThread: 'POST /api/chat/thread (MCP conversations_search-conversation)',
      chatSend: 'POST /api/chat/send (MCP conversations_send-a-new-message)',
      botProcess: 'POST /api/bot/process (deprecated - returns success for compatibility)'
    },
    mcp: {
      server: 'https://services.leadconnectorhq.com/mcp/',
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json'
      },
      tools_used: [
        'locations_get-location',
        'contacts_upsert-contact', 
        'conversations_search-conversation',
        'conversations_send-a-new-message'
      ]
    },
    requirements: {
      ghl_setup: 'Chat Widget must be configured with Chat Type set to Live Chat',
      ai_mode: 'Set Conversation AI to Auto-Pilot mode for automatic responses',
      channels: 'Live_Chat channel must be enabled for the Conversation AI bot',
      mcp_scopes: 'PIT must include View/Edit Contacts, Conversations, and Messages scopes'
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

