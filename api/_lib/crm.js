// Shared CRM MCP functions - CommonJS version

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

  // unwrap nested { content:[{ type:'text', text:'{...}' }]}
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
  
  const contact = extractContactFro