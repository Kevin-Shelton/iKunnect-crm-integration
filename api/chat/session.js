module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // MCP helper function (only what we need)
  async function searchContacts(query) {
    const fetch = (await import('node-fetch')).default;
    const mcpUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/';
    const pit = process.env.CRM_PIT;
    const locationId = process.env.CRM_LOCATION_ID;
    
    const jsonRpcRequest = {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'tools/call',
      params: { 
        name: 'contacts_get-contacts', 
        arguments: {
          locationId,
          query,
          limit: 10
        }
      }
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
    const body = responseText.startsWith('event: message\ndata: ') 
      ? responseText.slice('event: message\ndata: '.length).trim() 
      : responseText;
    
    let parsed = JSON.parse(body);
    let current = parsed?.result ?? parsed;
    
    // Unwrap nested content
    for (let i = 0; i < 3; i++) {
      const textNode = current?.content?.[0]?.text;
      if (!textNode) break;
      try { current = JSON.parse(textNode); } catch { break; }
    }

    return current?.data?.contacts || [];
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

      console.log('[SESSION] Searching for existing contact:', { name, email, phone });

      // Search for existing contact by email or phone
      const searchQuery = email || phone || name;
      const contacts = await searchContacts(searchQuery);
      
      console.log('[SESSION] Found contacts:', contacts.length);

      let contact = null;
      
      // Try to find exact match by email or phone
      if (email) {
        contact = contacts.find(c => (c.email || '').toLowerCase() === email.toLowerCase());
      }
      if (!contact && phone) {
        contact = contacts.find(c => c.phone === phone);
      }
      if (!contact && contacts.length > 0) {
        contact = contacts[0]; // Use first match
      }

      if (!contact) {
        // Return a message that we can't create new contacts due to permissions
        return res.status(400).json({
          success: false,
          error: 'Contact not found and cannot create new contacts. Please use an existing email/phone from your CRM.',
          availableContacts: contacts.slice(0, 5).map(c => ({
            name: c.contactName,
            email: c.email,
            phone: c.phone
          }))
        });
      }

      console.log('[SESSION] Using existing contact:', contact.id);

      const [firstName, ...rest] = String(name || contact.firstName || '').trim().split(/\s+/);
      const lastName = rest.join(' ') || contact.lastName || '';

      return res.json({
        success: true,
        data: {
          contactId: contact.id,
          isNewContact: false,
          contact: {
            id: contact.id,
            name: contact.contactName || `${firstName} ${lastName}`.trim(),
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