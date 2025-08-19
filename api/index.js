const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to make GoHighLevel MCP Server calls with detailed logging
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
  
  console.log(`[GHL MCP] === DETAILED REQUEST DEBUG ===`);
  console.log(`[GHL MCP] Tool: ${toolName}`);
  console.log(`[GHL MCP] Arguments:`, JSON.stringify(arguments_, null, 2));
  console.log(`[GHL MCP] Full Request:`, JSON.stringify(jsonRpcRequest, null, 2));
  console.log(`[GHL MCP] Headers:`, JSON.stringify(options.headers, null, 2));
  
  const response = await fetch(url, options);
  const responseText = await response.text();
  
  console.log(`[GHL MCP] === DETAILED RESPONSE DEBUG ===`);
  console.log(`[GHL MCP] Status: ${response.status}`);
  console.log(`[GHL MCP] Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
  console.log(`[GHL MCP] Raw Response:`, responseText);
  
  // Handle Server-Sent Events format
  if (responseText.startsWith('event: message\ndata: ')) {
    const jsonPart = responseText.replace('event: message\ndata: ', '').trim();
    console.log(`[GHL MCP] SSE JSON Part:`, jsonPart);
    
    try {
      const responseData = JSON.parse(jsonPart);
      console.log(`[GHL MCP] Parsed SSE Response:`, JSON.stringify(responseData, null, 2));
      
      if (responseData.error) {
        console.log(`[GHL MCP] SSE Error Details:`, JSON.stringify(responseData.error, null, 2));
        throw new Error(`MCP Tools/Call Error: ${responseData.error.code} - ${responseData.error.message}`);
      }
      
      console.log(`[GHL MCP] SSE Result:`, JSON.stringify(responseData.result, null, 2));
      return responseData.result;
    } catch (parseError) {
      console.log(`[GHL MCP] SSE Parse Error:`, parseError.message);
      throw new Error(`Failed to parse SSE response: ${jsonPart.substring(0, 200)}...`);
    }
  }
  
  // Handle regular JSON response
  let responseData;
  try {
    responseData = JSON.parse(responseText);
    console.log(`[GHL MCP] Parsed JSON Response:`, JSON.stringify(responseData, null, 2));
  } catch (parseError) {
    console.log(`[GHL MCP] JSON Parse Error:`, parseError.message);
    throw new Error(`Invalid response format: ${responseText.substring(0, 200)}...`);
  }
  
  if (!response.ok) {
    console.log(`[GHL MCP] HTTP Error Response:`, JSON.stringify(responseData, null, 2));
    throw new Error(`GHL MCP Error: ${response.status} - ${JSON.stringify(responseData)}`);
  }
  
  // Handle JSON-RPC error response
  if (responseData.error) {
    console.log(`[GHL MCP] JSON-RPC Error Details:`, JSON.stringify(responseData.error, null, 2));
    throw new Error(`MCP Tools/Call Error: ${responseData.error.code} - ${responseData.error.message}`);
  }
  
  // Return the result from JSON-RPC response
  console.log(`[GHL MCP] Final Result:`, JSON.stringify(responseData.result, null, 2));
  return responseData.result;
}

// Test different contact creation methods
async function testContactCreation(contactData) {
  console.log(`[GHL MCP] === TESTING CONTACT CREATION ===`);
  
  const testMethods = [
    'contacts_upsert-contact',
    'contacts_create-contact',
    'contacts_update-contact'
  ];
  
  for (const method of testMethods) {
    try {
      console.log(`[GHL MCP] Testing method: ${method}`);
      const result = await callGHLMCP(method, contactData);
      console.log(`[GHL MCP] SUCCESS with ${method}:`, result);
      return { method, result };
    } catch (error) {
      console.log(`[GHL MCP] FAILED with ${method}:`, error.message);
    }
  }
  
  throw new Error('All contact creation methods failed');
}

// Health check with detailed MCP testing
app.get('/api/health', async (req, res) => {
  try {
    console.log(`[GHL MCP] === HEALTH CHECK DEBUG ===`);
    
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
        method: 'tools/call',
        debug: 'Detailed logging enabled'
      }
    });
  } catch (error) {
    console.log(`[GHL MCP] Health check failed:`, error.message);
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

// Create or find contact with extensive debugging
app.post('/api/chat/session', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    console.log(`[GHL MCP] === SESSION CREATION DEBUG ===`);
    console.log(`[GHL MCP] Input - Name: ${name}, Email: ${email}, Phone: ${phone}`);
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    console.log(`[GHL MCP] Parsed - FirstName: ${firstName}, LastName: ${lastName}`);
    
    const contactData = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone || '',
      source: 'iKunnect Live Chat Widget',
      tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
    };
    
    let contact = null;
    let isNewContact = false;
    let usedMethod = '';
    
    try {
      // Test contact creation with detailed logging
      const testResult = await testContactCreation(contactData);
      usedMethod = testResult.method;
      const result = testResult.result;
      
      console.log(`[GHL MCP] Contact creation successful with method: ${usedMethod}`);
      console.log(`[GHL MCP] Raw result:`, JSON.stringify(result, null, 2));
      
      // Handle different MCP result formats
      if (result.content && result.content[0]) {
        console.log(`[GHL MCP] Processing content format result`);
        const content = result.content[0];
        if (content.type === 'text') {
          try {
            contact = JSON.parse(content.text);
            console.log(`[GHL MCP] Parsed contact from text:`, contact);
          } catch (parseError) {
            console.log(`[GHL MCP] Failed to parse contact text, using fallback`);
            contact = { 
              id: `contact_${Date.now()}`, 
              name: name,
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone
            };
          }
        }
      } else if (result.contact) {
        console.log(`[GHL MCP] Using direct contact result`);
        contact = result.contact;
      } else if (result.id) {
        console.log(`[GHL MCP] Using direct result as contact`);
        contact = result;
      } else {
        console.log(`[GHL MCP] Unknown result format, creating fallback contact`);
        contact = { 
          id: `contact_${Date.now()}`, 
          name: name,
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone
        };
      }
      
      isNewContact = result.isNew || true;
      console.log(`[GHL MCP] Final contact:`, JSON.stringify(contact, null, 2));
      
    } catch (error) {
      console.error('[GHL MCP] All contact creation methods failed:', error.message);
      throw error;
    }
    
    if (!contact || !contact.id) {
      console.error('[GHL MCP] Contact validation failed - no ID found');
      throw new Error('Failed to create or find contact - no valid ID returned');
    }
    
    console.log(`[GHL MCP] Session creation successful - Contact ID: ${contact.id}`);
    
    res.json({
      success: true,
      data: {
        contactId: contact.id,
        isNewContact: isNewContact,
        usedMethod: usedMethod,
        contact: {
          id: contact.id,
          name: contact.name || name,
          firstName: contact.firstName || firstName,
          lastName: contact.lastName || lastName,
          email: contact.email || email,
          phone: contact.phone || phone
        }
      },
      debug: {
        inputData: { name, email, phone },
        parsedData: { firstName, lastName },
        mcpMethod: usedMethod,
        rawResult: 'Check server logs for full details'
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

// Keep other endpoints simple for now
app.post('/api/chat/thread', async (req, res) => {
  const { contactId } = req.body;
  res.json({
    success: true,
    data: {
      conversationId: `pending_${contactId}_${Date.now()}`,
      isNewConversation: true,
      contactId: contactId,
      conversation: {
        id: `pending_${contactId}_${Date.now()}`,
        type: 'Live_Chat',
        status: 'pending'
      }
    }
  });
});

app.post('/api/chat/send', async (req, res) => {
  try {
    const { conversationId, body, contactId } = req.body;
    
    console.log(`[GHL MCP] === MESSAGE SEND DEBUG ===`);
    console.log(`[GHL MCP] ContactId: ${contactId}, Message: ${body}`);
    
    const messageData = await callGHLMCP('conversations_send-a-new-message', {
      contactId: contactId,
      message: body,
      type: 'Live_Chat'
    });
    
    res.json({
      success: true,
      data: {
        messageId: 'message_sent',
        conversationId: conversationId,
        contactId: contactId,
        body: body,
        timestamp: new Date().toISOString(),
        status: 'delivered',
        messageType: 'Live_Chat'
      }
    });
    
  } catch (error) {
    console.error('[GHL MCP Send Error]:', error);
    res.status(500).json({
      success: false,
      error: `Message sending failed: ${error.message}`
    });
  }
});

// Legacy endpoints
app.post('/api/bot/process', (req, res) => {
  res.json({
    success: true,
    data: {
      response: "Deprecated endpoint - GoHighLevel AI handles responses automatically",
      action: "deprecated",
      confidence: 1.0
    }
  });
});

app.get('/api/ghl-test', async (req, res) => {
  try {
    const locationData = await callGHLMCP('locations_get-location', {
      locationId: process.env.CRM_LOCATION_ID
    });
    
    res.json({
      success: true,
      message: 'MCP connection test successful!',
      debug: 'Check server logs for detailed request/response information'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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
    version: '23.0.0 - DEBUG',
    description: 'Debug version with extensive logging for MCP troubleshooting',
    status: 'operational',
    timestamp: new Date().toISOString(),
    note: 'Check server logs for detailed MCP request/response debugging',
    debug: {
      logging: 'Extensive logging enabled',
      contactMethods: ['contacts_upsert-contact', 'contacts_create-contact', 'contacts_update-contact'],
      testing: 'Multiple methods tested automatically'
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

