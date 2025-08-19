// GoHighLevel MCP Integration API for Vercel with Environment Variable Debugging
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, url } = req;
  const path = url.split('?')[0];

  // Debug environment variables
  const envDebug = {
    CRM_PIT: process.env.CRM_PIT ? `${process.env.CRM_PIT.substring(0, 10)}...` : 'NOT SET',
    CRM_LOCATION_ID: process.env.CRM_LOCATION_ID || 'NOT SET',
    CRM_MCP_URL: process.env.CRM_MCP_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET'
  };

  console.log('[ENV DEBUG] Environment variables:', envDebug);

  // Helper function to make GoHighLevel MCP Server calls using environment variables
  async function callGHLMCP(toolName, arguments_) {
    const fetch = (await import('node-fetch')).default;
    
    // Use CRM_MCP_URL from environment or fallback to default
    const mcpUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/';
    const pit = process.env.CRM_PIT;
    const locationId = process.env.CRM_LOCATION_ID;
    
    console.log('[ENV DEBUG] Using values:');
    console.log(`[ENV DEBUG] MCP URL: ${mcpUrl}`);
    console.log(`[ENV DEBUG] PIT: ${pit ? `${pit.substring(0, 10)}...` : 'MISSING'}`);
    console.log(`[ENV DEBUG] Location ID: ${locationId || 'MISSING'}`);
    
    if (!pit) {
      throw new Error('CRM_PIT environment variable is not set');
    }
    
    if (!locationId) {
      throw new Error('CRM_LOCATION_ID environment variable is not set');
    }
    
    const requestId = Date.now().toString();
    
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
        'Authorization': `Bearer ${pit}`,
        'locationId': locationId,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify(jsonRpcRequest)
    };
    
    console.log(`[GHL MCP] Calling tool: ${toolName}`);
    console.log(`[GHL MCP] Request headers:`, {
      'Authorization': `Bearer ${pit.substring(0, 10)}...`,
      'locationId': locationId,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    });
    
    const response = await fetch(mcpUrl, options);
    const responseText = await response.text();
    
    console.log(`[GHL MCP] Response status: ${response.status}`);
    console.log(`[GHL MCP] Response: ${responseText.substring(0, 500)}...`);
    
    // Handle Server-Sent Events format
    if (responseText.startsWith('event: message\ndata: ')) {
      const jsonPart = responseText.replace('event: message\ndata: ', '').trim();
      try {
        const responseData = JSON.parse(jsonPart);
        
        if (responseData.error) {
          console.log(`[GHL MCP] MCP Error:`, responseData.error);
          throw new Error(`MCP Error: ${responseData.error.code} - ${responseData.error.message}`);
        }
        
        return responseData.result;
      } catch (parseError) {
        console.log(`[GHL MCP] Parse Error:`, parseError.message);
        throw new Error(`Failed to parse SSE response: ${parseError.message}`);
      }
    }
    
    // Handle regular JSON response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.log(`[GHL MCP] JSON Parse Error:`, parseError.message);
      throw new Error(`Invalid response format: ${responseText.substring(0, 200)}...`);
    }
    
    if (!response.ok) {
      console.log(`[GHL MCP] HTTP Error:`, responseData);
      throw new Error(`GHL MCP Error: ${response.status} - ${JSON.stringify(responseData)}`);
    }
    
    if (responseData.error) {
      console.log(`[GHL MCP] Response Error:`, responseData.error);
      throw new Error(`MCP Error: ${responseData.error.code} - ${responseData.error.message}`);
    }
    
    return responseData.result;
  }

  try {
    // Route handling
    if (method === 'GET' && path === '/api') {
      return res.json({
        name: 'iKunnect GoHighLevel MCP Integration API',
        version: '27.0.0 - ENV DEBUG',
        description: 'GoHighLevel MCP Server integration with environment variable debugging',
        status: 'operational',
        timestamp: new Date().toISOString(),
        environment: envDebug,
        endpoints: {
          health: 'GET /api/health',
          chatSession: 'POST /api/chat/session',
          chatThread: 'POST /api/chat/thread', 
          chatSend: 'POST /api/chat/send',
          ghlTest: 'GET /api/ghl-test'
        }
      });
    }

    if (method === 'GET' && path === '/api/hello') {
      return res.json({ 
        message: 'Hello World!', 
        timestamp: new Date().toISOString(),
        status: 'working',
        environment: envDebug
      });
    }

    if (method === 'GET' && path === '/api/health') {
      try {
        const locationData = await callGHLMCP('locations_get-location', {
          locationId: process.env.CRM_LOCATION_ID
        });
        
        return res.json({
          success: true,
          message: 'GoHighLevel MCP Server connected successfully',
          timestamp: new Date().toISOString(),
          environment: envDebug,
          ghl: {
            connected: true,
            locationId: process.env.CRM_LOCATION_ID,
            mcpServer: process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/'
          }
        });
      } catch (error) {
        return res.json({
          success: false,
          message: 'MCP Server connection failed',
          timestamp: new Date().toISOString(),
          error: error.message,
          environment: envDebug,
          ghl: {
            connected: false,
            hasToken: !!process.env.CRM_PIT,
            locationId: process.env.CRM_LOCATION_ID
          }
        });
      }
    }

    if (method === 'GET' && path === '/api/ghl-test') {
      try {
        const locationData = await callGHLMCP('locations_get-location', {
          locationId: process.env.CRM_LOCATION_ID
        });
        
        return res.json({
          success: true,
          message: 'GoHighLevel MCP Server test successful',
          result: locationData,
          timestamp: new Date().toISOString(),
          environment: envDebug
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
          environment: envDebug
        });
      }
    }

    if (method === 'POST' && path === '/api/chat/session') {
      const { name, email, phone } = req.body;
      
      console.log(`[SESSION] Creating session for: ${name} (${email})`);
      
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Name and email are required'
        });
      }

      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      try {
        const contactData = await callGHLMCP('contacts_upsert-contact', {
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone || '',
          source: 'iKunnect Live Chat Widget',
          tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
        });
        
        console.log('[GHL MCP] Contact upsert result:', JSON.stringify(contactData, null, 2));
        
        // Handle MCP result format
        let contact = null;
        if (contactData.content && contactData.content[0]) {
          const content = contactData.content[0];
          if (content.type === 'text') {
            try {
              const parsed = JSON.parse(content.text);
              // Handle nested content structure
              if (parsed.content && parsed.content[0] && parsed.content[0].text) {
                const innerParsed = JSON.parse(parsed.content[0].text);
                console.log('[GHL MCP] Inner parsed result:', innerParsed);
                if (innerParsed.success === false) {
                  return res.status(500).json({
                    success: false,
                    error: `Contact creation failed: ${innerParsed.data?.message || innerParsed.message || 'Unknown error'}`,
                    ghlError: innerParsed,
                    environment: envDebug
                  });
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
          contact = { 
            id: `contact_${Date.now()}`, 
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone
          };
        }
        
        if (!contact || !contact.id) {
          return res.status(500).json({
            success: false,
            error: 'Failed to create or find contact - no valid ID returned',
            environment: envDebug
          });
        }
        
        console.log('[GHL MCP] Final contact:', contact);
        
        return res.json({
          success: true,
          data: {
            contactId: contact.id,
            isNewContact: true,
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
        return res.status(500).json({
          success: false,
          error: `Contact creation failed: ${error.message}`,
          environment: envDebug
        });
      }
    }

    if (method === 'POST' && path === '/api/chat/thread') {
      const { contactId } = req.body;
      
      if (!contactId) {
        return res.status(400).json({
          success: false,
          error: 'Contact ID is required'
        });
      }

      return res.json({
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
    }

    if (method === 'POST' && path === '/api/chat/send') {
      const { conversationId, body, contactId } = req.body;
      
      if (!body || !contactId) {
        return res.status(400).json({
          success: false,
          error: 'Message body and contact ID are required'
        });
      }

      try {
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
              const parsed = JSON.parse(content.text);
              if (parsed.content && parsed.content[0] && parsed.content[0].text) {
                const innerParsed = JSON.parse(parsed.content[0].text);
                if (innerParsed.success === false) {
                  return res.status(500).json({
                    success: false,
                    error: `Message sending failed: ${innerParsed.data?.message || innerParsed.message || 'Unknown error'}`,
                    ghlError: innerParsed,
                    environment: envDebug
                  });
                }
                messageResult = innerParsed;
              } else {
                messageResult = parsed;
              }
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
        
        return res.json({
          success: true,
          data: {
            messageId: messageId,
            conversationId: actualConversationId,
            contactId: contactId,
            body: body,
            timestamp: new Date().toISOString(),
            status: 'delivered',
            messageType: 'Live_Chat'
          }
        });
        
      } catch (mcpError) {
        console.error('[GHL MCP Send Error]:', mcpError);
        return res.status(500).json({
          success: false,
          error: `Message sending failed: ${mcpError.message}`,
          environment: envDebug
        });
      }
    }

    if (method === 'POST' && path === '/api/bot/process') {
      return res.json({
        success: true,
        data: {
          response: "This endpoint is deprecated. GoHighLevel Conversation AI handles responses automatically via MCP Server.",
          action: "deprecated",
          confidence: 1.0,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 404 for unmatched routes
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: path,
      method: method,
      environment: envDebug
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      environment: envDebug
    });
  }
}

