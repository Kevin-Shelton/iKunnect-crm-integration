// Shared CRM MCP functions
export async function callMCP(toolName, arguments_) {
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

export async function findExistingContact(email, phone) {
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

export async function upsertContact({ firstName, lastName, email, phone }) {
  const r = await callMCP('contacts_upsert-contact', {
    firstName: firstName || '',
    lastName: lastName || '',
    email: email || '',
    phone: phone || '',
    source: 'iKunnect Live Chat Widget',
    tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
  });
  
  const contact = extractContactFromMCPResponse(r) || r;
  if (!contact?.id) {
    throw new Error('Contact upsert returned no id');
  }
  
  return contact;
}

function extractContactFromMCPResponse(mcpResult) {
  if (!mcpResult) return null;
  
  if (mcpResult.content && mcpResult.content[0]?.type === 'text') {
    try {
      const parsed = JSON.parse(mcpResult.content[0].text);
      if (parsed.content && parsed.content[0]?.text) {
        const inner = JSON.parse(parsed.content[0].text);
        if (inner.success === false) {
          throw new Error(inner.data?.message || inner.message || 'Operation failed');
        }
        return inner.data?.contact || inner.contact || inner.data;
      }
      if (parsed.success === false) {
        throw new Error(parsed.data?.message || parsed.message || 'Operation failed');
      }
      return parsed.data?.contact || parsed.contact || parsed.data || parsed;
    } catch {
      return null;
    }
  }
  
  return mcpResult.contact || mcpResult.data || mcpResult;
}

export async function sendInboundMessage({ contactId, text, provider = 'web_chat' }) {
  const fetch = (await import('node-fetch')).default;
  const base = process.env.CRM_BASE_URL || 'https://services.leadconnectorhq.com';
  const pit = process.env.CRM_PIT;
  const locationId = process.env.CRM_LOCATION_ID;
  
  if (!pit || !locationId) {
    throw new Error('Missing required env: CRM_PIT or CRM_LOCATION_ID');
  }

  const payload = {
    contactId,
    message: text,
    type: 'Live_Chat',
    provider,
    source: 'live_chat'
  };

  const headers = {
    Authorization: `Bearer ${pit}`,
    locationId,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Version: '2021-07-28'
  };

  console.log('[CRM] Sending inbound message:', JSON.stringify(payload, null, 2));

  const resp = await fetch(`${base}/conversations/messages/inbound`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const txt = await resp.text();
  console.log('[CRM] Inbound response:', resp.status, txt);

  if (!resp.ok) {
    throw new Error(`CRM API error: ${resp.status} - ${txt}`);
  }

  return JSON.parse(txt);
}

export function extractConversationId(obj) {
  const paths = [
    'data.conversationId',
    'conversationId', 
    'conversation.id',
    'data.conversation.id',
    'data.id',
    'id',
    'message.conversationId',
    'data.messageId'
  ];
  
  for (const path of paths) {
    const value = path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
    if (value) {
      console.log(`[CRM] Found conversationId at '${path}':`, value);
      return value;
    }
  }
  
  console.log('[CRM] No conversationId found');
  return null;
}