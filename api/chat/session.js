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
      try { current = JSON.parse(textNode); } catch { break; }
    }

    if (current?.error) {
      throw new Error(`${current.error?.code || 'CRM_ERROR'}: ${current.error?.message || 'Unknown error'}`);
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

      const [firstName, ...rest] = String(name || '').trim().split(/\s+/);
      const lastName = rest.join(' ');

      console.log('[SESSION] Creating contact in CRM:', { firstName, lastName, email, phone });

      // Create contact in CRM using MCP
      const mcpResult = await callMCP('contacts_upsert-contact', {
        firstName: firstName || '',
        lastName: lastName || '',
        email: email || '',
        phone: phone || '',
        source: 'iKunnect Live Chat Widget',
        tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
      });

      console.log('[SESSION] MCP contact result:', JSON.stringify(mcpResult, null, 2));

      // Extract contact from MCP response
      let contact = mcpResult;
      if (mcpResult?.data?.contact) {
        contact = mcpResult.data.contact;
      } else if (mcpResult?.contact) {
        contact = mcpResult.contact;
      } else if (mcpResult?.data) {
        contact = mcpResult.data;
      }

      if (!contact?.id) {
        throw new Error('Contact creation failed - no ID returned');
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
      console.error('[SESSION] Contact creation failed:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Contact creation failed: ${error.message}` 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};