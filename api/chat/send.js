// api/chat/send.js
// Vercel Serverless Function — iKunnect ↔ GoHighLevel MCP (Live_Chat)
// Sends customer’s first message as INBOUND by contact, then OUTBOUND by conversation.

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, locationId, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

function pick(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
}

function parseMcpEnvelope(status, rawText) {
  if (!rawText || typeof rawText !== 'string') throw new Error(`Empty MCP response [${status}]`);
  const ssePrefix = 'event: message\ndata: ';
  const body = rawText.startsWith(ssePrefix) ? rawText.slice(ssePrefix.length).trim() : rawText;

  let parsed;
  try { parsed = JSON.parse(body); }
  catch { throw new Error(`Invalid MCP response [${status}]: ${body.slice(0, 240)}...`); }

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

async function callGHLMCP(toolName, input = {}) {
  const mcpUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/';
  const pit = process.env.CRM_PIT;
  const locationId = process.env.CRM_LOCATION_ID;
  if (!pit || !locationId) throw new Error('Missing env: CRM_PIT or CRM_LOCATION_ID');

  const headers = {
    Authorization: `Bearer ${pit}`,
    locationId,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream'
  };

  // Preferred envelope: { tool, input }
  let resp = await fetch(mcpUrl, { method: 'POST', headers, body: JSON.stringify({ tool: toolName, input }) });
  let txt = await resp.text();
  if (resp.ok) return parseMcpEnvelope(resp.status, txt);

  // Fallback JSON-RPC
  const rpc = { jsonrpc: '2.0', id: Date.now().toString(), method: 'tools/call', params: { name: toolName, arguments: input } };
  resp = await fetch(mcpUrl, { method: 'POST', headers, body: JSON.stringify(rpc) });
  txt = await resp.text();
  if (!resp.ok) throw new Error(`GHL MCP Error [${resp.status}]: ${txt.slice(0, 240)}...`);
  return parseMcpEnvelope(resp.status, txt);
}

async function sendInboundVisitorMessage({ contactId, text, provider = 'live-chat' }) {
  // Be liberal with field names to satisfy tool variations.
  const input = {
    contactId,                 // camelCase
    contact_id: contactId,     // snake_case
    contact: { id: contactId },// nested style (seen in some tools)
    text,
    message: text,             // some handlers use `message`
    provider,                  // 'live-chat' | 'webchat'
    messageType: 'Live_Chat'
  };
  console.log('[MCP] conversations_add-an-inbound-message input:', input);
  return callGHLMCP('conversations_add-an-inbound-message', input);
}

async function sendOutboundMessage({ conversationId, text, messageType = 'Live_Chat' }) {
  const input = {
    conversationId,
    conversation_id: conversationId,
    id: conversationId,        // some handlers read `id` for conversation id
    text,
    message: text,
    messageType
  };
  console.log('[MCP] conversations_send-a-new-message input:', input);
  return callGHLMCP('conversations_send-a-new-message', input);
}

function extractConversationId(obj) {
  return (
    pick(obj, 'data.conversationId') ||
    pick(obj, 'conversationId') ||
    pick(obj, 'conversation.id') ||
    pick(obj, 'data.id') ||
    pick(obj, 'id') ||
    null
  );
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { conversationId, body, contactId, channel } = (req.body || {});
    if (!body || !contactId) {
      return res.status(400).json({ success: false, error: 'Message body and contactId are required' });
    }

    const text = String(body).trim();
    if (!text) return res.status(400).json({ success: false, error: 'Message body cannot be empty' });

    const provider = (channel && String(channel).toLowerCase() === 'webchat') ? 'webchat' : 'live-chat';

    let finalConversationId = conversationId || null;
    let mcpObj;

    if (!finalConversationId) {
      console.log('[SEND] INBOUND (first message):', { contactId, provider, text });
      const inbound = await sendInboundVisitorMessage({ contactId, text, provider });
      mcpObj = inbound;
      finalConversationId = extractConversationId(inbound);
      console.log('[SEND] inbound response conversationId:', finalConversationId);
    } else {
      console.log('[SEND] OUTBOUND (follow-up):', { conversationId: finalConversationId, text });
      const outbound = await sendOutboundMessage({ conversationId: finalConversationId, text, messageType: 'Live_Chat' });
      mcpObj = outbound;
    }

    if (!finalConversationId) {
      return res.status(502).json({ success: false, error: 'No conversationId returned by MCP' });
    }

    const messageId =
      pick(mcpObj, 'data.messageId') ||
      pick(mcpObj, 'messageId') ||
      pick(mcpObj, 'message.id') ||
      'message_created';

    return res.status(200).json({
      success: true,
      data: {
        messageId,
        conversationId: finalConversationId,
        contactId,
        body: text,
        messageType: 'Live_Chat',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[api/chat/send] Error:', err);
    return res.status(500).json({ success: false, error: `Message sending failed: ${err.message}` });
  }
}
