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

    console.log('[MCP] Request:', JSON.stringify(jsonRpcRequest, null, 2));

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
    console.log('[MCP] Raw response:', response.status, responseText);
    
    if (!response.ok) {
      throw new Error(`CRM MCP Error: ${response.status} - ${responseText.slice(0, 240)}...`);
    }
    
    // Parse MCP response
    const ssePrefix = 'event: message\ndata: ';
    const body = responseText.startsWith(ssePrefix) ? responseText.slice(ssePrefix.length).trim() : responseText;
    
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      console.log('[MCP] JSON parse error:', err.message);
      throw new Error(`Invalid MCP response: ${body.slice(0, 240)}...`);
    }
    
    console.log('[MCP] Parsed response:', JSON.stringify(parsed, null, 2));
    
    let current = parsed?.result ?? parsed;
    
    // Unwrap nested content
    for (let i = 0; i < 5; i++) {
      const textNode = current?.content?.[0]?.text;
      if (!textNode || typeof textNode !== 'string') break;
      try { 
        const nested = JSON.parse(textNode);
        console.log(`[MCP] Unwrapped level ${i + 1}:`, JSON.stringify(nested, null, 2));
        current = nested;
      } catch { 
        break; 
      }
    }

    console.log('[MCP] Final processed result:', JSON.stringify(current, null, 2));

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

      console.log('[SESSION] Full MCP result structure:', JSON.stringify(mcpResult, null, 2));

      // Try multiple paths to find the contact
      const possiblePaths = [
        mcpResult?.data?.contact,
        mcpResult?.contact,
        mcpResult?.data,
        mcpResult,
        mcpResult?.result?.contact,
        mcpResult?.result?.data?.contact,
        mcpResult?.result?.data,
        mcpResult?.result
      ];

      let contact = null;
      for (let i = 0; i < possiblePaths.length; i++) {
        const candidate = possiblePaths[i];
        console.log(`[SESSION] Checking path ${i}:`, candidate);
        if (candidate && candidate.id) {
          contact = candidate;
          console.log(`[SESSION] Found contact at path ${i}:`, contact);
          break;
        }
      }

      if (!contact || !contact.id) {
        console.error('[SESSION] No contact found in any path. Full result:', mcpResult);
        return res.status(500).json({ 
          success: false, 
          error: 'Contact creation failed - no ID returned',
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
      console.error('[SESSION] Contact creation failed:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Contact creation failed: ${error.message}` 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};