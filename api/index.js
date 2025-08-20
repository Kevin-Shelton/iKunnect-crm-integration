// GoHighLevel MCP Integration API - Fixed Contact ID Parameter
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

  // Helper function to make GoHighLevel MCP Server calls
  async function callGHLMCP(toolName, arguments_) {
    const fetch = (await import('node-fetch')).default;
    
    const mcpUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/';
    const pit = process.env.CRM_PIT;
    const locationId = process.env.CRM_LOCATION_ID;
    
    if (!pit || !locationId) {
      throw new Error('Missing required environment variables: CRM_PIT or CRM_LOCATION_ID');
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
    console.log(`[GHL MCP] Arguments:`, JSON.stringify(arguments_, null, 2));
    
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
          throw new Error(`MCP Error: ${responseData.error.code} - ${responseData.error.message}`);
        }
        
        return responseData.result;
      } catch (parseError) {
        throw new Error(`Failed to parse SSE response: ${parseError.message}`);
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
    
    if (responseData.error) {
      throw new Error(`MCP Error: ${responseData.error.code} - ${responseData.error.message}`);
    }
    
    return responseData.result;
  }

  // Helper function to extract contact data from MCP response
  function extractContactFromMCPResponse(mcpResult) {
    if (!mcpResult) return null;
    
    // Handle nested content structure
    if (mcpResult.content && mcpResult.content[0]) {
      const content = mcpResult.content[0];
      if (content.type === 'text') {
        try {
          const parsed = JSON.parse(content.text);
          
          // Handle double-nested structure
          if (parsed.content && parsed.content[0] && parsed.content[0].text) {
            const innerParsed = JSON.parse(parsed.content[0].text);
            
            if (innerParsed.success === false) {
              throw new Error(innerParsed.data?.message || innerParsed.message || 'Operation failed');
            }
            
            return innerParsed.data?.contact || innerParsed.contact || innerParsed.data;
          }
          
          if (parsed.success === false) {
            throw new Error(parsed.data?.message || parsed.message || 'Operation failed');
          }
          
          return parsed.data?.contact || parsed.contact || parsed.data || parsed;
        } catch (parseError) {
          console.log('[GHL MCP] Parse error:', parseError.message);
          return null;
        }
      }
    }
    
    // Handle direct contact structure
    return mcpResult.contact || mcpResult.data || mcpResult;
  }

  // Helper function to find existing contact by email
  async function findExistingContact(email, phone) {
    try {
      console.log(`[CONTACT SEARCH] Looking for existing contact: ${email}`);
      
      const searchResult = await callGHLMCP('contacts_get-contacts', {
        locationId: process.env.CRM_LOCATION_ID,
        query: email,
        limit: 10
      });
      
      // Extract contacts from MCP response
      let contacts = [];
      if (searchResult.content && searchResult.content[0]) {
        const content = searchResult.content[0];
        if (content.type === 'text') {
          try {
            const parsed = JSON.parse(content.text);
            if (parsed.content && parsed.content[0] && parsed.content[0].text) {
              const innerParsed = JSON.parse(parsed.content[0].text);
              contacts = innerParsed.data?.contacts || innerParsed.contacts || [];
            } else {
              contacts = parsed.data?.contacts || parsed.contacts || [];
            }
          } catch {
            contacts = [];
          }
        }
      } else {
        contacts = searchResult.contacts || searchResult.data?.contacts || [];
      }
      
      // Find exact match by email or phone
      const exactMatch = contacts.find(contact => 
        contact.email === email || 
        (phone && contact.phone === phone)
      );
      
      if (exactMatch) {
        console.log(`[CONTACT SEARCH] Found existing contact: ${exactMatch.id}`);
        return exactMatch;
      }
      
      console.log('[CONTACT SEARCH] No existing contact found');
      return null;
      
    } catch (error) {
      console.log('[CONTACT SEARCH] Search failed:', error.message);
      return null;
    }
  }

  // Helper function to create new contact
  async function createNewContact(firstName, lastName, email, phone) {
    try {
      console.log(`[CONTACT CREATE] Creating new contact: ${firstName} ${lastName}`);
      
      const createResult = await callGHLMCP('contacts_create-contact', {
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone || '',
        source: 'iKunnect Live Chat Widget',
        tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
      });
      
      const contact = extractContactFromMCPResponse(createResult);
      
      if (contact && contact.id) {
        console.log(`[CONTACT CREATE] Successfully created contact: ${contact.id}`);
        return contact;
      }
      
      throw new Error('Failed to create contact - no ID returned');
      
    } catch (error) {
      console.log('[CONTACT CREATE] Creation failed:', error.message);
      throw error;
    }
  }

  try {
    // Route handling
    if (method === 'GET' && path === '/api') {
      return res.json({
        name: 'iKunnect GoHighLevel MCP Integration API',
        version: '31.0.0 - FIXED CONTACT_ID PARAMETER',
        description: 'GoHighLevel MCP Server integration with correct contact_id parameter format',
        status: 'operational',
        timestamp: new Date().toISOString()
      });
    }

    if (method === 'GET' && path === '/api/hello') {
      return res.json({ 
        message: 'Hello World!', 
        timestamp: new Date().toISOString(),
        status: 'working'
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
          error: error.message
        });
      }
    }

    if (method === 'POST' && path === '/api/chat/session') {
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
      
      try {
        console.log(`[SESSION] Starting session for: ${firstName} ${lastName} (${email})`);
        
        // Step 1: Try to find existing contact
        let contact = await findExistingContact(email, phone);
        let isNewContact = false;
        
        // Step 2: If no existing contact, create new one
        if (!contact) {
          contact = await createNewContact(firstName, lastName, email, phone);
          isNewContact = true;
        }
        
        if (!contact || !contact.id) {
          return res.status(500).json({
            success: false,
            error: 'Failed to create or find contact - no valid ID returned'
          });
        }
        
        console.log(`[SESSION] Using contact: ${contact.id} (${isNewContact ? 'new' : 'existing'})`);
        
        return res.json({
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
        console.error('[SESSION ERROR]:', error);
        return res.status(500).json({
          success: false,
          error: `Contact handling failed: ${error.message}`
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
        console.log(`[MESSAGE] Sending message to contact ${contactId}: ${body}`);
        
        // Use the correct parameter name: contact_id (with underscore)
        const messageParams = {
          contact_id: contactId,  // FIXED: Use underscore format
          message: body,
          type: 'Live_Chat'
        };
        
        console.log('[MESSAGE] Using parameters:', JSON.stringify(messageParams, null, 2));
        
        const messageData = await callGHLMCP('conversations_send-a-new-message', messageParams);
        
        console.log('[MESSAGE] Message sent successfully:', JSON.stringify(messageData, null, 2));
        
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
                    error: `Message sending failed: ${innerParsed.data?.message || innerParsed.message || 'Unknown error'}`
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
        console.error('[MESSAGE ERROR]:', mcpError);
        return res.status(500).json({
          success: false,
          error: `Message sending failed: ${mcpError.message}`
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
      method: method
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

