module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // MCP helper function
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
          query: query || '',
          limit: 20
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
      expect: 'POST JSON { name/email/phone }',
      note: 'Use existing contacts from CRM (contact creation requires Edit Contacts permission)'
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

      console.log('[SESSION] Searching for contact:', { name, email, phone });

      // Search for existing contact
      const searchQuery = email || phone || name;
      const contacts = await searchContacts(searchQuery);
      
      console.log(`[SESSION] Found ${contacts.length} contacts for query: ${searchQuery}`);

      let contact = null;
      
      // Try to find exact match by email or phone
      if (email) {
        contact = contacts.find(c => (c.email || '').toLowerCase() === email.toLowerCase());
        console.log('[SESSION] Email match:', contact ? contact.id : 'none');
      }
      if (!contact && phone) {
        contact = contacts.find(c => c.phone === phone);
        console.log('[SESSION] Phone match:', contact ? contact.id : 'none');
      }
      if (!contact && name) {
        contact = contacts.find(c => 
          (c.contactName || '').toLowerCase().includes(name.toLowerCase()) ||
          (c.firstName || '').toLowerCase() === name.toLowerCase().split(' ')[0] ||
          (c.email || '').toLowerCase().includes(name.toLowerCase())
        );
        console.log('[SESSION] Name match:', contact ? contact.id : 'none');
      }

      if (!contact) {
        // Get a broader list to show available options
        const allContacts = await searchContacts('');
        const availableContacts = allContacts
          .filter(c => c.email || c.phone) // Only show contacts with email or phone
          .slice(0, 10)
          .map(c => ({
            name: c.contactName,
            email: c.email,
            phone: c.phone
          }));

        return res.status(400).json({
          success: false,
          error: 'Contact not found. Try one of these existing contacts:',
          suggestion: 'Use an exact email or phone number from the list below',
          availableContacts,
          searchedFor: { name, email, phone },
          totalContacts: allContacts.length
        });
      }

      console.log('[SESSION] Using existing contact:', contact.id, contact.contactName);

      return res.json({
        success: true,
        data: {
          contactId: contact.id,
          isNewContact: false,
          contact: {
            id: contact.id,
            name: contact.contactName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email || '',
            phone: contact.phone || ''
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