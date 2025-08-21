module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Enhanced MCP helper function with debugging
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

    console.log('[SEARCH] Request:', JSON.stringify(jsonRpcRequest, null, 2));

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
    console.log('[SEARCH] Raw response:', response.status, responseText.slice(0, 500));
    
    const body = responseText.startsWith('event: message\ndata: ') 
      ? responseText.slice('event: message\ndata: '.length).trim() 
      : responseText;
    
    let parsed = JSON.parse(body);
    console.log('[SEARCH] Parsed:', JSON.stringify(parsed, null, 2));
    
    let current = parsed?.result ?? parsed;
    
    // Unwrap nested content
    for (let i = 0; i < 5; i++) {
      const textNode = current?.content?.[0]?.text;
      if (!textNode) break;
      try { 
        const nested = JSON.parse(textNode);
        console.log(`[SEARCH] Unwrapped level ${i + 1}:`, JSON.stringify(nested, null, 2));
        current = nested;
      } catch { 
        break; 
      }
    }

    console.log('[SEARCH] Final result:', JSON.stringify(current, null, 2));

    if (current?.success === false) {
      throw new Error(`Search failed: ${current?.data?.message || current?.message}`);
    }

    const contacts = current?.data?.contacts || [];
    console.log(`[SEARCH] Extracted ${contacts.length} contacts`);
    
    return contacts;
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

      console.log('[SESSION] Searching for contact:', { name, email, phone });

      // Try different search strategies
      let contacts = [];
      let searchQuery = '';

      // Strategy 1: Search by email
      if (email) {
        searchQuery = email;
        console.log('[SESSION] Searching by email:', searchQuery);
        contacts = await searchContacts(searchQuery);
        console.log(`[SESSION] Email search found: ${contacts.length} contacts`);
      }

      // Strategy 2: If no results, try phone
      if (contacts.length === 0 && phone) {
        searchQuery = phone;
        console.log('[SESSION] Searching by phone:', searchQuery);
        contacts = await searchContacts(searchQuery);
        console.log(`[SESSION] Phone search found: ${contacts.length} contacts`);
      }

      // Strategy 3: If no results, try name
      if (contacts.length === 0 && name) {
        searchQuery = name;
        console.log('[SESSION] Searching by name:', searchQuery);
        contacts = await searchContacts(searchQuery);
        console.log(`[SESSION] Name search found: ${contacts.length} contacts`);
      }

      // Strategy 4: If still no results, try empty query to get all
      if (contacts.length === 0) {
        console.log('[SESSION] Searching with empty query to get all contacts');
        contacts = await searchContacts('');
        console.log(`[SESSION] Empty search found: ${contacts.length} contacts`);
      }

      // Show first few contacts for debugging
      if (contacts.length > 0) {
        console.log('[SESSION] First 3 contacts found:');
        contacts.slice(0, 3).forEach((c, i) => {
          console.log(`  ${i + 1}. ${c.contactName} (${c.email || 'no email'}) (${c.phone || 'no phone'})`);
        });
      }

      let contact = null;
      
      // Try to find exact match
      if (email) {
        contact = contacts.find(c => (c.email || '').toLowerCase() === email.toLowerCase());
        console.log('[SESSION] Email match:', contact ? contact.contactName : 'none');
      }
      if (!contact && phone) {
        contact = contacts.find(c => c.phone === phone);
        console.log('[SESSION] Phone match:', contact ? contact.contactName : 'none');
      }

      if (!contact && contacts.length > 0) {
        // Use first contact for testing
        contact = contacts[0];
        console.log('[SESSION] Using first contact for testing:', contact.contactName);
      }

      if (!contact) {
        return res.status(400).json({
          success: false,
          error: 'No contacts found in CRM',
          debug: {
            searchQuery,
            totalContacts: contacts.length,
            searchedFor: { name, email, phone }
          }
        });
      }

      console.log('[SESSION] Using contact:', contact.id, contact.contactName);

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
            phone: