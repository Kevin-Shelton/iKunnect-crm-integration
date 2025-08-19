const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to make MCP JSON-RPC calls with debugging
async function callMCPAPI(method, params = {}) {
  const fetch = require('node-fetch');
  
  // Try different possible MCP endpoints
  const possibleUrls = [
    'https://services.leadconnectorhq.com/mcp/',
    'https://services.leadconnectorhq.com/mcp',
    'https://services.leadconnectorhq.com/api/v1/mcp/',
    'https://services.leadconnectorhq.com/api/v1/mcp',
    process.env.CRM_MCP_URL
  ].filter(Boolean);
  
  const url = possibleUrls[0]; // Start with the first one
  
  // JSON-RPC 2.0 format
  const requestBody = {
    jsonrpc: "2.0",
    method: method,
    params: params,
    id: Date.now()
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRM_PIT}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'User-Agent': 'iKunnect-MCP-Integration/1.0'
    },
    body: JSON.stringify(requestBody)
  };
  
  console.log(`[MCP DEBUG] URL: ${url}`);
  console.log(`[MCP DEBUG] Request:`, JSON.stringify(requestBody, null, 2));
  console.log(`[MCP DEBUG] Headers:`, JSON.stringify(options.headers, null, 2));
  
  try {
    const response = await fetch(url, options);
    
    console.log(`[MCP DEBUG] Response Status: ${response.status}`);
    console.log(`[MCP DEBUG] Response Headers:`, JSON.stringify([...response.headers.entries()], null, 2));
    
    // Get response as text first to see what we're getting
    const responseText = await response.text();
    console.log(`[MCP DEBUG] Response Text (first 500 chars):`, responseText.substring(0, 500));
    
    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.log(`[MCP DEBUG] JSON Parse Error:`, parseError.message);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
    }
    
    console.log(`[MCP DEBUG] Parsed Response:`, JSON.stringify(responseData, null, 2));
    
    if (!response.ok) {
      throw new Error(`MCP API Error: ${response.status} - ${JSON.stringify(responseData)}`);
    }
    
    // Check for JSON-RPC error
    if (responseData.error) {
      throw new Error(`MCP RPC Error: ${responseData.error.code} - ${responseData.error.message}`);
    }
    
    return responseData.result;
  } catch (fetchError) {
    console.log(`[MCP DEBUG] Fetch Error:`, fetchError.message);
    throw fetchError;
  }
}

// Debug endpoint to test MCP connection
app.get('/api/debug-mcp', async (req, res) => {
  try {
    console.log('[DEBUG] Testing MCP connection...');
    console.log('[DEBUG] Environment variables:');
    console.log('  CRM_MCP_URL:', process.env.CRM_MCP_URL);
    console.log('  CRM_PIT exists:', !!process.env.CRM_PIT);
    console.log('  CRM_LOCATION_ID:', process.env.CRM_LOCATION_ID);
    
    // Try a simple method first
    const result = await callMCPAPI('locations.get', {
      locationId: process.env.CRM_LOCATION_ID
    });
    
    res.json({
      success: true,
      message: 'MCP connection successful!',
      result: result,
      debug: {
        url: process.env.CRM_MCP_URL,
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      debug: {
        url: process.env.CRM_MCP_URL,
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID,
        errorType: error.constructor.name
      }
    });
  }
});

// Test with REST API instead of MCP
app.get('/api/test-rest', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    
    // Try GoHighLevel REST API instead
    const url = `https://services.leadconnectorhq.com/locations/${process.env.CRM_LOCATION_ID}`;
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRM_PIT}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28'
      }
    };
    
    console.log(`[REST DEBUG] URL: ${url}`);
    console.log(`[REST DEBUG] Headers:`, JSON.stringify(options.headers, null, 2));
    
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`[REST DEBUG] Response Status: ${response.status}`);
    console.log(`[REST DEBUG] Response Text:`, responseText.substring(0, 500));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
    }
    
    res.json({
      success: response.ok,
      status: response.status,
      data: responseData,
      debug: {
        url: url,
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      debug: {
        hasToken: !!process.env.CRM_PIT,
        locationId: process.env.CRM_LOCATION_ID
      }
    });
  }
});

// Simplified chat session using REST API
app.post('/api/chat/session', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    const fetch = require('node-fetch');
    
    // Try creating contact using REST API
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

    const url = 'https://services.leadconnectorhq.com/contacts/';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRM_PIT}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(contactData)
    };

    console.log(`[REST Contact] URL: ${url}`);
    console.log(`[REST Contact] Data:`, JSON.stringify(contactData, null, 2));

    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`[REST Contact] Response Status: ${response.status}`);
    console.log(`[REST Contact] Response:`, responseText.substring(0, 500));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
    }

    if (!response.ok) {
      throw new Error(`REST API Error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    const contact = responseData.contact || responseData;
    
    res.json({
      success: true,
      data: {
        contactId: contact.id,
        isNewContact: true,
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
    console.error('[REST Session Error]:', error);
    res.status(500).json({
      success: false,
      error: `REST integration failed: ${error.message}`,
      details: 'Check your REST API credentials and try again'
    });
  }
});

// Keep other endpoints simple for now
app.post('/api/chat/thread', (req, res) => {
  res.json({
    success: true,
    data: {
      conversationId: `conv-${Date.now()}`,
      isNewConversation: true,
      contactId: req.body.contactId
    }
  });
});

app.post('/api/chat/send', (req, res) => {
  res.json({
    success: true,
    data: {
      messageId: `msg-${Date.now()}`,
      conversationId: req.body.conversationId,
      body: req.body.body,
      timestamp: new Date().toISOString()
    }
  });
});

app.post('/api/bot/process', (req, res) => {
  res.json({
    success: true,
    data: {
      response: "Hello! I'm testing the REST API integration.",
      action: "greeting",
      confidence: 0.9,
      timestamp: new Date().toISOString()
    }
  });
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
    name: 'iKunnect Debug API',
    version: '4.0.0',
    description: 'Debug version to test GoHighLevel integration',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      debugMcp: 'GET /api/debug-mcp',
      testRest: 'GET /api/test-rest',
      chatSession: 'POST /api/chat/session'
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

