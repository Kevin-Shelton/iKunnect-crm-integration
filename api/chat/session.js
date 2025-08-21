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
      
      console.log(`[CONTACT SEARCH] Searching for: ${q}`);
      
      const r = await callMCP('contacts_get-contacts', {
        locationId: process.env.CRM_LOCATION_ID,
        query: q,
        limit: 25
      });
      
      console.log('[CONTACT SEARCH] Raw response:', JSON.stringify(r, null, 2));
      
      const contacts = r?.data?.contacts || r?.contacts || (Array.isArray(r?.data) ? r.data : []) || [];
      
      console.log(`[CONTACT SEARCH] Found ${contacts.length} contacts`);