module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // CRM functions built into this file
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

    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pit}`,
        locationId,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream'
      },
      body: JSON.stringify(jsonRpcRequest)
    };

    const response = await fetch(mcpUrl, options);
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`CRM MCP Error: ${response.status} - ${responseText.slice(0, 240)}...`);
    }
    
    return parseMcpEnvelopeText(response.status, responseText);
  }

  function parseMcpEnvelopeText(status, rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error(`Empty MCP response [${status}]`);
    }
    
    const ssePrefix = 'event: message\ndata: ';
    const body = rawText.startsWith(ssePrefix) ? rawText.slice(ssePrefix.length).trim() : rawText;

    let parsed;
    try { 
      parsed = JSON.parse(body); 
    } catch { 
      throw new Error(`Invalid MCP response [${status}]: ${body.slice(0, 240)}...`); 
    }

    const base = parsed?.result ?? parsed;

    // unwrap nested content
    let current = base;
    for (let i = 0; i < 5; i++) {
      const textNode = current?.content?.[0]?.text;
      if (!textNode || typeof textNode !== 'string') break;
      try { current = JSON.parse(textNode); } catch { break; }
    }

    if (current?.error) {
      const msg = current.error?.message || 'Unknown MCP error';
      const code = current.error?.code || status;
      throw new Error(`${code}: ${msg}`);
    }
    
    return current;
  }

  async function findExistingContact(email, phone) {
    try {
      const q = email || phone;
      if (!q) return null;
      
      const r = await callMCP('contacts_get-contacts', {
        locationId: process.env.CRM_LOCATION_ID,
        query: q,
        limit: 25
      });
      
      const contacts = r?.data?.contacts || r?.contacts || (Array.isArray(r?.data) ? r.data : []) || [];
      
      const exact = (email && contacts.find(c => (c.email || '').toLowerCase() === String(email).toLowerCase())) ||
                    (phone && contacts.find(c => (c.phone || '') === phone));
      
      return exact || contacts[0] || null;
    } catch (e) {
      console.log('[CONTACT SEARCH] Failed:', e.message);
      return null;
    }
  }

  async function upsertContact({ firstName, lastName, email, phone }) {
    const r = await callMCP('contacts_upsert-contact', {
      firstName: firstName || '',
      lastName: lastName || '',
      email: email || '',
      phone: phone || '',
      source: 'iKunnect Live Chat Widget',
      tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
    });
    
    // Extract contact from MCP response
    let contact = r;
    if (r?.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(r.content[0].text);
        if (parsed.content?.[0]?.text) {
          const inner = JSON.parse(parsed.content[0].text);
          contact = inner.data?.contact || inner.contact || inner.data || inner;
        } else {
          contact = parsed.data?.contact || parsed.contact || parsed.data || parsed;
        }
      } catch {
        contact = r.contact || r.data || r;
      }
    }
    
    if (!contact?.id) {
      throw new Error('Contact upsert returned no id');
    }
    
    return contact;
  }

  try {
    console.log('Session endpoint called:', req.method, req.url);

    if (req.method === 'GET') {
      return res.json({ 
        ok: true, 
        route: '/api/chat/session', 
        expect: 'POST JSON { name/email/phone }'
      });
    }

    if (req.method === 'POST') {
      const { name, email, phone } = req.body;
      
      if (!name && !email && !phone) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one of name, email, or phone is required' 
        });
      }

      const [firstName, ...rest] = String(name || '').trim().split(/\s+/);
      const lastName = rest.join(' ');

      let contact = await findExistingContact(email, phone);
      let isNewContact = false;
      
      if (!contact) {
        contact = await upsertContact({ firstName, lastName, email, phone });
        isNewContact = true;
      }

      return res.json({
        success: true,
        data: {
          contactId: contact.id,
          isNewContact,
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
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Session endpoint error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message
    });
  }
};