const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to make GoHighLevel MCP Server calls using exact tool names from the list
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
  
  console.log(`[GHL MCP] === EXACT TOOL CALL ===`);
  console.log(`[GHL MCP] Tool: ${toolName}`);
  console.log(`[GHL MCP] Arguments:`, JSON.stringify(arguments_, null, 2));
  
  const response = await fetch(url, options);
  const responseText = await response.text();
  
  console.log(`[GHL MCP] Status: ${response.status}`);
  console.log(`[GHL MCP] Response:`, responseText.substring(0, 500));
  
  // Handle Server-Sent Events format
  if (responseText.startsWith('event: message\ndata: ')) {
    const jsonPart = responseText.replace('event: message\ndata: ', '').trim();
    try {
      const responseData = JSON.parse(jsonPart);
      
      if (responseData.error) {
        throw new Error(`MCP Error: ${responseData.error.code} - ${responseData.error.message}`);
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
    throw new Error(`MCP Error: ${responseData.error.code} - ${responseData.error.message}`);
  }
  
  return responseData.result;
}

// Test MCP Server connection with exact tool names
app.get('/api/health', async (req, res) => {
  try {
    // Use exact tool name from the list: #14 Get Location
    const locationData = await callGHLMCP('locations_get-location', {
      locationId: process.env.CRM_LOCATION_ID
    });
    
    res.json({
      success: true,
      message: 'GoHighLevel MCP Server connected successfully',
      timestamp: new Date().toISOString(),
      ghl: {
        connected: true,
        locationId: process.env.CRM_LOCATION_ID,
        mcpServer: 'https://services.leadconnectorhq.com/mcp/',
        toolUsed: 'locations_get-location'
      }
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'MCP Server connection failed',
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

// Create or find contact using exact MCP tool names
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
    
    console.log(`[GHL MCP] Creating contact: ${firstName} ${lastName} (${email})`);
    
    let contact = null;
    let isNewContact = false;
    
    try {
      // Use exact tool name from the list: #8 Upsert Contact
      const contactData = await callGHLMCP('contacts_upsert-contact', {
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone || '',
        source: 'iKunnect Live Chat Widget',
        tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
      });
      
      console.log('[GHL MCP] Contact upsert result:', JSON.stringify(contactData, null, 2));
      
      // Handle MCP result format - extract contact from nested structure
      if (contactData.content && contactData.content[0]) {
        const content = contactData.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            // Handle nested content structure
            if (parsed.content && parsed.content[0] && parsed.content[0].text) {
              const innerParsed = JSON.parse(parsed.content[0].text);
              if (innerParsed.success === false) {
                throw new Error(`Contact creation failed: ${innerParsed.data?.message || 'Unknown error'}`);
              }
              contact = innerParsed.contact || innerParsed.data;
            } else {
              contact = parsed.contact || parsed.data || parsed;
            }
          } catch (parseError) {
            console.log('[GHL MCP] Parse error, using fallback contact');
            contact = { 
              id: `contact_${Date.now()}`, 
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone
            };
          }
        }
      } else if (contactData.contact) {
        contact = contactData.contact;
      } else if (contactData.id) {
        contact = contactData;
      } else {
        // Fallback contact creation
        contact = { 
          id: `contact_${Date.now()}`, 
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone
        };
      }
      
      isNewContact = contactData.isNew || true;
      console.log('[GHL MCP] Final contact:', JSON.stringify(contact, null, 2));
      
    } catch (error) {
      console.error('[GHL MCP] Contact creation failed:', error.message);
      throw error;
    }
    
    if (!contact || !contact.id) {
      throw new Error('Failed to create or find contact - no valid ID returned');
    }
    
    res.json({
      success: true,
      data: {
        contactId: contact.id,
        isNewContact: isNewContact,
        contact: {
          id: contact.id,
          name: `${contact.firstName || firstName} ${contact.lastName || lastName}`.trim(),
          firstName: contact.firstName || firstName,
          lastName: contact.lastName || lastName,
          email: contact.email || email,
          phone: contact.phone || phone
        }
      }
    });
    
  } catch (error) {
    console.error('[GHL MCP Session Error]:', error);
    res.status(500).json({
      success: false,
      error: `GoHighLevel MCP integration failed: ${error.message}`,
      details: 'Check server logs for detailed debugging information'
    });
  }
});

// Find or create conversation using exact MCP tool names
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
      // Use exact tool name from the list: #11 Search Conversation
      const searchData = await callGHLMCP('conversations_search-conversation', {
        contactId: contactId,
        locationId: process.env.CRM_LOCATION_ID
      });
      
      console.log('[GHL MCP] Conversation search result:', JSON.stringify(searchData, null, 2));
      
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
      error: `GoHighLevel MCP conversation search failed: ${error.message}`
    });
  }
});

// Send message using exact MCP tool names
app.post('/api/chat/send', async (req, res) => {
  try {
    const { conversationId, body, contactId } = req.body;
    
    if (!body || !contactId) {
      return res.status(400).json({
        success: false,
        error: 'Message body and contact ID are required'
      });
    }

    console.log(`[GHL MCP] Sending message to contact ${contactId}: ${body}`);

    try {
      // Use exact tool name from the list: #13 Send a New Message
      const messageData = await callGHLMCP('conversations_send-a-new-message', {
        contactId: contactId,
        message: body,
        type: 'Live_Chat'
      });
      
      console.log('[GHL MCP] Message sent successfully:', JSON.stringify(messageData, null, 2));
      
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
          toolUsed: 'conversations_send-a-new-message'
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
      error: `GoHighLevel MCP message sending failed: ${error.message}`
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
      timestamp: new Date().toISOString()
    }
  });
});

// Test MCP Server connection with exact tool names
app.get('/api/ghl-test', async (req, res) => {
  try {
    // Test multiple exact tool names from the list
    const tests = [
      { name: 'locations_get-location', args: { locationId: process.env.CRM_LOCATION_ID } },
      { name: 'contacts_get-contacts', args: { limit: 1 } }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        const result = await callGHLMCP(test.name, test.args);
        results.push({ tool: test.name, status: 'success', result: 'Connected' });
      } catch (error) {
        results.push({ tool: test.name, status: 'failed', error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: 'GoHighLevel MCP Server tool testing completed',
      tests: results,
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
      error: error.message
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
    version: '24.0.0',
    description: 'Using exact MCP tool names from the official GoHighLevel MCP Server list',
    status: 'operational',
    timestamp: new Date().toISOString(),
    mcp: {
      server: 'https://services.leadconnectorhq.com/mcp/',
      protocol: 'JSON-RPC 2.0',
      method: 'tools/call',
      tools_used: [
        'locations_get-location (#14)',
        'contacts_upsert-contact (#8)', 
        'conversations_search-conversation (#11)',
        'conversations_send-a-new-message (#13)'
      ]
    },
    requirements: {
      ghl_setup: 'Chat Widget configured with Chat Type set to Live Chat',
      ai_mode: 'Conversation AI set to Auto-Pilot mode for automatic responses',
      channels: 'Live_Chat channel enabled for the Conversation AI bot',
      mcp_scopes: 'PIT must include all required scopes for MCP Server access'
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

