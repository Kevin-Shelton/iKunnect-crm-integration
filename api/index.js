// GoHighLevel MCP Integration API - Debug Contact Creation
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
    
    console.log(`[GHL MCP] === CALLING TOOL ===`);
    console.log(`[GHL MCP] Tool: ${toolName}`);
    console.log(`[GHL MCP] Arguments:`, JSON.stringify(arguments_, null, 2));
    
    const response = await fetch(mcpUrl, options);
    const responseText = await response.text();
    
    console.log(`[GHL MCP] === RESPONSE ===`);
    console.log(`[GHL MCP] Status: ${response.status}`);
    console.log(`[GHL MCP] Raw Response: ${responseText}`);
    
    // Handle Server-Sent Events format
    if (responseText.startsWith('event: message\ndata: ')) {
      const jsonPart = responseText.replace('event: message\ndata: ', '').trim();
      console.log(`[GHL MCP] SSE JSON Part: ${jsonPart}`);
      
      try {
        const responseData = JSON.parse(jsonPart);
        console.log(`[GHL MCP] Parsed SSE Response:`, JSON.stringify(responseData, null, 2));
        
        if (responseData.error) {
          throw new Error(`MCP Error: ${responseData.error.code} - ${responseData.error.message}`);
        }
        
        return responseData.result;
      } catch (parseError) {
        console.log(`[GHL MCP] SSE Parse Error:`, parseError.message);
        throw new Error(`Failed to parse SSE response: ${parseError.message}`);
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
      throw new Error(`GHL MCP Error: ${response.status} - ${JSON.stringify(responseData)}`);
    }
    
    if (responseData.error) {
      throw new Error(`MCP Error: ${responseData.error.code} - ${responseData.error.message}`);
    }
    
    return responseData.result;
  }

  try {
    // Route handling
    if (method === 'GET' && path === '/api') {
      return res.json({
        name: 'iKunnect GoHighLevel MCP Integration API',
        version: '30.0.0 - DEBUG CONTACT CREATION',
        description: 'Debug version to troubleshoot contact creation issues',
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
        console.log(`[SESSION] === STARTING SESSION ===`);
        console.log(`[SESSION] Name: ${firstName} ${lastName}`);
        console.log(`[SESSION] Email: ${email}`);
        console.log(`[SESSION] Phone: ${phone || 'none'}`);
        
        // Step 1: Try to find existing contact
        console.log(`[SESSION] === SEARCHING FOR EXISTING CONTACT ===`);
        
        let existingContact = null;
        try {
          const searchResult = await callGHLMCP('contacts_get-contacts', {
            locationId: process.env.CRM_LOCATION_ID,
            query: email,
            limit: 5
          });
          
          console.log(`[SESSION] Search result type: ${typeof searchResult}`);
          console.log(`[SESSION] Full search result:`, JSON.stringify(searchResult, null, 2));
          
          // Try to extract contacts from various possible response structures
          let contacts = [];
          
          if (searchResult.content && searchResult.content[0]) {
            console.log(`[SESSION] Found content structure`);
            const content = searchResult.content[0];
            if (content.type === 'text') {
              try {
                const parsed = JSON.parse(content.text);
                console.log(`[SESSION] Parsed content:`, JSON.stringify(parsed, null, 2));
                
                if (parsed.content && parsed.content[0] && parsed.content[0].text) {
                  const innerParsed = JSON.parse(parsed.content[0].text);
                  console.log(`[SESSION] Inner parsed:`, JSON.stringify(innerParsed, null, 2));
                  contacts = innerParsed.data?.contacts || innerParsed.contacts || [];
                } else {
                  contacts = parsed.data?.contacts || parsed.contacts || [];
                }
              } catch (parseError) {
                console.log(`[SESSION] Content parse error:`, parseError.message);
                contacts = [];
              }
            }
          } else {
            console.log(`[SESSION] Direct result structure`);
            contacts = searchResult.contacts || searchResult.data?.contacts || [];
          }
          
          console.log(`[SESSION] Extracted contacts:`, JSON.stringify(contacts, null, 2));
          
          // Find exact match
          existingContact = contacts.find(contact => 
            contact.email === email || 
            (phone && contact.phone === phone)
          );
          
          if (existingContact) {
            console.log(`[SESSION] Found existing contact:`, JSON.stringify(existingContact, null, 2));
          } else {
            console.log(`[SESSION] No existing contact found`);
          }
          
        } catch (searchError) {
          console.log(`[SESSION] Search failed:`, searchError.message);
        }
        
        let contact = existingContact;
        let isNewContact = false;
        
        // Step 2: If no existing contact, create new one
        if (!contact) {
          console.log(`[SESSION] === CREATING NEW CONTACT ===`);
          
          try {
            const createResult = await callGHLMCP('contacts_create-contact', {
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone || '',
              source: 'iKunnect Live Chat Widget',
              tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
            });
            
            console.log(`[SESSION] Create result type: ${typeof createResult}`);
            console.log(`[SESSION] Full create result:`, JSON.stringify(createResult, null, 2));
            
            // Try to extract contact from various possible response structures
            if (createResult.content && createResult.content[0]) {
              console.log(`[SESSION] Found content structure in create result`);
              const content = createResult.content[0];
              if (content.type === 'text') {
                try {
                  const parsed = JSON.parse(content.text);
                  console.log(`[SESSION] Parsed create content:`, JSON.stringify(parsed, null, 2));
                  
                  if (parsed.content && parsed.content[0] && parsed.content[0].text) {
                    const innerParsed = JSON.parse(parsed.content[0].text);
                    console.log(`[SESSION] Inner parsed create:`, JSON.stringify(innerParsed, null, 2));
                    
                    if (innerParsed.success === false) {
                      throw new Error(innerParsed.data?.message || innerParsed.message || 'Contact creation failed');
                    }
                    
                    contact = innerParsed.data?.contact || innerParsed.contact || innerParsed.data;
                  } else {
                    if (parsed.success === false) {
                      throw new Error(parsed.data?.message || parsed.message || 'Contact creation failed');
                    }
                    contact = parsed.data?.contact || parsed.contact || parsed.data || parsed;
                  }
                } catch (parseError) {
                  console.log(`[SESSION] Create content parse error:`, parseError.message);
                  // Create fallback contact
                  contact = { 
                    id: `contact_${Date.now()}`, 
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    phone: phone
                  };
                }
              }
            } else {
              console.log(`[SESSION] Direct create result structure`);
              contact = createResult.contact || createResult.data || createResult;
            }
            
            console.log(`[SESSION] Final extracted contact:`, JSON.stringify(contact, null, 2));
            isNewContact = true;
            
          } catch (createError) {
            console.log(`[SESSION] Create failed:`, createError.message);
            throw createError;
          }
        }
        
        console.log(`[SESSION] === FINAL CONTACT CHECK ===`);
        console.log(`[SESSION] Contact object:`, JSON.stringify(contact, null, 2));
        console.log(`[SESSION] Contact ID: ${contact?.id}`);
        console.log(`[SESSION] Is new contact: ${isNewContact}`);
        
        if (!contact || !contact.id) {
          return res.status(500).json({
            success: false,
            error: 'Failed to create or find contact - no valid ID returned',
            debug: {
              contactObject: contact,
              isNewContact: isNewContact,
              searchAttempted: !existingContact,
              createAttempted: !existingContact
            }
          });
        }
        
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
        console.log(`[MESSAGE] === SENDING MESSAGE ===`);
        console.log(`[MESSAGE] Contact ID: ${contactId}`);
        console.log(`[MESSAGE] Message: ${body}`);
        
        const messageParams = {
          contactId: contactId,
          message: body,
          type: 'Live_Chat'
        };
        
        const messageData = await callGHLMCP('conversations_send-a-new-message', messageParams);
        
        return res.json({
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

