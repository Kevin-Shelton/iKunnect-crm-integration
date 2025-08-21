module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // MCP helper functions
  async function callMCP(toolName, arguments_) {
    const fetch = (await import('node-fetch')).default;
    const mcpUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/';
    const pit = process.env.CRM_PIT;
    const locationId = process.env.CRM_LOCATION_ID;
    
    if (!pit || !locationId) {
      throw new Error('Missing required env: CRM_PIT or CRM_LOCATION_ID');
    }

    const jsonRpcRequest = {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'tools/call',
      params: { name: toolName, arguments: arguments_ || {} }
    };

    console.log(`[MCP] Calling ${toolName} with:`, JSON.stringify(arguments_, null, 2));

    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pit}`,
        locationId,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify(jsonRpcRequest)
    });

    const responseText = await response.text();
    console.log(`[MCP] ${toolName} raw response:`, response.status, responseText);
    
    if (!response.ok) {
      throw new Error(`CRM MCP Error: ${response.status} - ${responseText.slice(0, 240)}...`);
    }
    
    // Parse MCP response
    const ssePrefix = 'event: message\ndata: ';
    const body = responseText.startsWith(ssePrefix) ? responseText.slice(ssePrefix.length).trim() : responseText;
    
    let parsed = JSON.parse(body);
    let current = parsed?.result ?? parsed;
    
    // Unwrap nested content
    for (let i = 0; i < 5; i++) {
      const textNode = current?.content?.[0]?.text;
      if (!textNode || typeof textNode !== 'string') break;
      try { 
        current = JSON.parse(textNode);
      } catch { 
        break; 
      }
    }

    console.log(`[MCP] ${toolName} processed result:`, JSON.stringify(current, null, 2));

    if (current?.error || (current?.success === false)) {
      throw new Error(`${current?.error?.code || current?.data?.statusCode || 'CRM_ERROR'}: ${current?.error?.message || current?.data?.message || current?.message || 'Unknown error'}`);
    }
    
    return current;
  }

  if (req.method === 'GET') {
    return res.json({ 
      ok: true, 
      route: '/api/chat/session', 
      expect: 'POST JSON { name/email/phone }'
    });
  }

  if (req.method === 'POST') {
    try {
      const { name, email, phone } = req.body;
      
      if (!name && !email && !phone) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one of name, email, or phone is required' 
        });
      }

      // First, test if we can get location info (read-only operation)
      console.log('[SESSION] Testing location access...');
      try {
        const locationResult = await callMCP('locations_get-location', {
          locationId: process.env.CRM_LOCATION_ID
        });
        console.log('[SESSION] Location access test passed:', locationResult?.name || 'Location found');
      } catch (locError) {
        console.error('[SESSION] Location access test failed:', locError.message);
        return res.status(500).json({ 
          success: false, 
          error: `Location access failed: ${locError.message}` 
        });
      }

      // Try to search for existing contacts first (read operation)
      console.log('[SESSION] Testing contact search...');
      try {
        const searchResult = await callMCP('contacts_get-contacts', {
          locationId: process.env.CRM_LOCATION_ID,
          query: email || phone || name,
          limit: 5
        });
        console.log('[SESSION] Contact search test passed, found:', searchResult?.data?.contacts?.length || 0, 'contacts');
      } catch (searchError) {
        console.error('[SESSION] Contact search test failed:', searchError.message);
        return res.status(500).json({ 
          success: false, 
          error: `Contact search failed: ${searchError.message}` 
        });
      }

      // Now try creating a contact
      const [firstName, ...rest] = String(name || '').trim().split(/\s+/);
      const lastName = rest.join(' ');

      console.log('[SESSION] Creating contact in CRM:', { firstName, lastName, email, phone });

      const mcpResult = await callMCP('contacts_upsert-contact', {
        firstName: firstName || '',
        lastName: lastName || '',
        email: email || '',
        phone: phone || '',
        source: 'iKunnect Live Chat Widget',
        tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
      });

      // Extract contact from successful result
      let contact = mcpResult?.data?.contact || mcpResult?.contact || mcpResult?.data || mcpResult;

      if (!contact?.id) {
        return res.status(500).json({ 
          success: false, 
          error: 'Contact creation succeeded but no ID returned',
          debug: mcpResult
        });
      }

      console.log('[SESSION] Contact created successfully:', contact.id);

      return res.json({
        success: true,
        data: {
          contactId: contact.id,
          isNewContact: true,
          contact: {
            id: contact.id,
            name: `${contact.firstName || firstName || ''} ${contact.lastName || lastName || ''}`.trim(),
            firstName: contact.firstName || firstName || '',
            lastName: contact.lastName || lastName || '',
            email: contact.email || email || '',
            phone: contact.phone || phone || ''
          }
        }
      });

    } catch (error) {
      console.error('[SESSION] Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};