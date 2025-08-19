const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to make GoHighLevel MCP Server calls using proper MCP tools/call format
async function callGHLMCP(toolName, arguments_) {
  const fetch = require('node-fetch');
  
  const url = 'https://services.leadconnectorhq.com/mcp/';
  
  // Generate unique ID for JSON-RPC request
  const requestId = Date.now().toString();
  
  // Proper MCP JSON-RPC 2.0 format using tools/call
  const jsonRpcRequest = {
    jsonrpc: "2.0",
    id: requestId,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: arguments_ || {}
    }
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRM_PIT}`,
      'locationId': process.env.CRM_LOCATION_ID,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify(jsonRpcRequest)
  };
  
  console.log(`[GHL MCP] Tools/Call Request:`, JSON.stringify(jsonRpcRequest, null, 2));
  
  const response = await fetch(url, options);
  const responseText = await response.text();
  
  console.log(`[GHL MCP Response] ${response.status}:`, responseText.substring(0, 500));
  
  // Handle Server-Sent Events format
  if (responseText.startsWith('event: message\ndata: ')) {
    const jsonPart = responseText.replace('event: message\ndata: ', '').trim();
    try {
      const responseData = JSON.parse(jsonPart);
      
      if (responseData.error) {
        throw new Error(`MCP Tools/Call Error: ${responseData.error.code} - ${responseData.error.message}`);
      }
      
      return responseData.result;
    } catch (parseError) {
      throw new Error(`Failed to parse SSE response: ${jsonPart.substring(0, 200)}...`);
    }
  }
  
  // Handle regular JSON response
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(`Invalid response format: ${responseText.substring(0, 200)}...`);
  }
  
  if (!response.ok) {
    throw new Error(`GHL MCP Error: ${response.status} - ${JSON.stringify(responseData)}`);
  }
  
  // Handle JSON-RPC error response
  if (responseData.error) {
    throw new Error(`MCP Tools/Call Error: ${responseData.error.code} - ${responseData.error.message}`);
  }
  
  // Return the result from JSON-RPC response
  return responseData.result;
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
        mcpServer: 'https://services.leadconnectorhq.com/mcp/',
        method: 'tools/call'
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
      // Try to upsert contact using proper tools/call method
      const contactData = await callGHLMCP('contacts_upsert-contact', {
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone || '',
        source: 'iKunnect Live Chat Widget',
        tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
      });
      
      // Handle MCP result format
      if (contactData.content && contactData.content[0]) {
        const content = contactData.content[0];
        if (content.type === 'text') {
          try {
            contact = JSON.parse(content.text);
          } catch {
            contact = { id: 'parsed_from_text', name: name };
          }
        }
      } else {
        contact = contactData.contact || contactData;
      }
      
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
      // Search for existing conversations using proper tools/call method
      const searchData = await callGHLMCP('conversations_search-conversation', {
        contactId: contactId,
        locationId: process.env.CRM_LOCATION_ID
      });
      
      // Handle MCP result format
      let conversations = [];
      if (searchData.content && searchData.content[0]) {
        const content = searchData.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            conversations = parsed.conversations || [];
          } catch {
            conversations = [];
          }
        }
      } else {
        conversations = searchData.conversations || [];
      }
      
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
    if (!conversation) {
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

// Send message using MCP Server with proper tools/call format
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
      // Use proper tools/call method to send a new message
      const messageData = await callGHLMCP('conversations_send-a-new-message', {
        contactId: contactId,
        message: body,
        type: 'Live_Chat'
      });
      
      console.log('[GHL MCP] Message sent successfully:', messageData);
      
      // Handle MCP result format
      let messageResult = messageData;
      if (messageData.content && messageData.content[0]) {
        const content = messageData.content[0];
        if (content.type === 'text') {
          try {
            messageResult = JSON.parse(content.text);
          } catch {
            messageResult = { id: 'message_sent', status: 'delivered' };
          }
        }
      }
      
      const messageId = messageResult.messageId || 
                       messageResult.message?.id || 
                       messageResult.id || 
                       'message_created';
      
      const actualConversationId = messageResult.conversationId || 
                                  messageResult.conversation?.id || 
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
          method: 'tools/call',
          note: 'Message sent via GoHighLevel MCP Server using proper tools/call method'
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
      note: "Messages are now sent via GoHighLevel MCP Server using tools/call method."
    }
  });
});

// Test MCP Server connection with proper tools/call format
app.get('/api/ghl-test', async (req, res) => {
  try {
    const locationData = await callGHLMCP('locations_get-location', {
      locationId: process.env.CRM_LOCATION_ID
    });
    
    // Handle MCP result format
    let location = locationData;
    if (locationData.content && locationData.content[0]) {
      const content = locationData.content[0];
      if (content.type === 'text') {
        try {
          location = JSON.parse(content.text);
        } catch {
          location = { name: 'Location Retrieved', id: process.env.CRM_LOCATION_ID };
        }
      }
    }
    
    res.json({
      success: true,
      message: 'GoHighLevel MCP Server connection successful with tools/call method!',
      location: {
        id: location.id,
        name: location.name,
        website: location.website,
        companyId: location.companyId
      },
      mcp: {
        endpoint: 'https://services.leadconnectorhq.com/mcp/',
        method: 'tools/call',
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
        method: 'tools/call',
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
    version: '22.0.0',
    description: 'Using proper MCP tools/call JSON-RPC 2.0 method for GoHighLevel MCP Server',
    status: 'operational',
    timestamp: new Date().toISOString(),
    note: 'Now using correct MCP protocol: method="tools/call" with params.name and params.arguments',
    endpoints: {
      health: 'GET /api/health (MCP Server health check)',
      ghlTest: 'GET /api/ghl-test (MCP Server connection test)',
      chatSession: 'POST /api/chat/session (tools/call contacts_upsert-contact)',
      chatThread: 'POST /api/chat/thread (tools/call conversations_search-conversation)',
      chatSend: 'POST /api/chat/send (tools/call conversations_send-a-new-message)',
      botProcess: 'POST /api/bot/process (deprecated - returns success for compatibility)'
    },
    mcp: {
      server: 'https://services.leadconnectorhq.com/mcp/',
      protocol: 'JSON-RPC 2.0',
      method: 'tools/call',
      format: {
        jsonrpc: '2.0',
        id: 'unique_request_id',
        method: 'tools/call',
        params: {
          name: 'tool_name',
          arguments: 'tool_parameters'
        }
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

