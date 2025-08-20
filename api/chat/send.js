// api/chat/send.js
// iKunnect ↔ GoHighLevel (Vercel Serverless Function)
// First message: find-or-create contact (MCP) -> inbound Live_Chat (Integrations API)
// Follow-ups: outbound on conversation (MCP)

const HANDLER_ID = 'vercel-chat-send-v3';

// ---------- Small utilities ----------
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // set to your domain if using cookies
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, locationId, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('X-Handler', HANDLER_ID); // diagnostic header so you can confirm which code runs
}

function pick(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
}

function splitName(name) {
  if (!name) return { firstName: '', lastName: '' };
  const parts = String(name).trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
}

function parseMcpEnvelope(status, rawText) {
  if (!rawText || typeof rawText !== 'string') throw new Error(`Empty MCP response [${status}]`);
  const ssePrefix = 'event: message\ndata: ';
  const body = rawText.startsWith(ssePrefix) ? rawText.slice(ssePrefix.length).trim() : rawText;

  let parsed;
  try { parsed = JSON.parse(body); }
  catch { throw new Error(`Invalid MCP response [${status}]: ${body.slice(0, 240)}...`); }

  const base = parsed?.result ?? parsed;

  // unwrap up to 5 nested { content:[{ type:'text', text:'{...}' }]}
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

// ---------- MCP + Integrations calls ----------
async function callMCP(toolName, input = {}) {
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

  // Preferred MCP envelope
  let resp = await fetch(mcpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tool: toolName, input })
  });
  let txt = await resp.text();
  if (resp.ok) return parseMcpEnvelope(resp.status, txt);

  // Fallback JSON-RPC
  const rpc = { jsonrpc: '2.0', id: Date.now().toString(), method: 'tools/call', params: { name: toolName, arguments: input } };
  resp = await fetch(mcpUrl, { method: 'POST', headers, body: JSON.stringify(rpc) });
  txt = await resp.text();
  if (!resp.ok) throw new Error(`GHL MCP Error [${resp.status}]: ${txt.slice(0, 240)}...`);
  return parseMcpEnvelope(resp.status, txt);
}

async function findExistingContact({ email, phone }) {
  const q = email || phone;
  if (!q) return null;

  const r = await callMCP('contacts_get-contacts', {
    locationId: process.env.CRM_LOCATION_ID,
    query: q,
    limit: 25
  });

  const contacts =
    pick(r, 'data.contacts') || pick(r, 'contacts') || (Array.isArray(r?.data) ? r.data : []) || [];

  const exact =
    (email && contacts.find(c => (c.email || '').toLowerCase() === String(email).toLowerCase())) ||
    (phone && contacts.find(c => (c.phone || '') === phone));

  return exact || contacts[0] || null;
}

async function upsertContact({ name, email, phone, source, tags }) {
  const { firstName, lastName } = splitName(name);
  const r = await callMCP('contacts_upsert-contact', {
    firstName,
    lastName,
    email: email || '',
    phone: phone || '',
    source: source || 'iKunnect Chat Widget',
    tags: tags && Array.isArray(tags) ? tags : ['iKunnect', 'Live Chat']
  });
  const contact = pick(r, 'data.contact') || pick(r, 'contact') || r;
  if (!contact?.id) throw new Error('Contact upsert returned no id');
  return contact;
}

// Integrations API: FIRST (visitor) message by contactId
async function postInboundByContact({ contactId, text, provider }) {
  const base = process.env.CRM_BASE_URL || 'https://services.leadconnectorhq.com';
  const pit = process.env.CRM_PIT;
  const locationId = process.env.CRM_LOCATION_ID;
  if (!pit || !locationId) throw new Error('Missing env: CRM_PIT or CRM_LOCATION_ID');

  const payload = {
    contactId,
    message: text,
    type: 'Live_Chat',
    provider // 'live-chat' or 'webchat'
  };

  const headers = {
    Authorization: `Bearer ${pit}`,
    locationId,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Version: '2021-07-28' // accepted by most LC endpoints
  };

  const resp = await fetch(`${base}/conversations/messages/inbound`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const txt = await resp.text();
  let json;
  try { json = JSON.parse(txt); } catch { throw new Error(`Inbound API bad response [${resp.status}]: ${txt.slice(0,240)}...`); }
  if (!resp.ok) throw new Error(json?.message || json?.error || `Inbound API ${resp.status}`);
  return json;
}

// MCP: follow-up message on existing conversation
async function sendOutboundOnThread({ conversationId, text, messageType = 'Live_Chat' }) {
  return callMCP('conversations_send-a-new-message', {
    conversationId,
    text,
    messageType
  });
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

// ---------- Handler ----------
export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Diagnostic: GET lets you confirm this function is the one running
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, handler: HANDLER_ID });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      conversationId,
      contactId,
      body,
      channel,          // 'chat' | 'webchat'
      name,
      email,
      phone,
      source,
      tags
    } = (req.body || {});

    if (!body) return res.status(400).json({ success: false, error: 'Message body is required' });
    const text = String(body).trim();
    if (!text) return res.status(400).json({ success: false, error: 'Message body cannot be empty' });

    const provider = (channel && String(channel).toLowerCase() === 'webchat') ? 'webchat' : 'live-chat';

    let finalConversationId = conversationId || null;
    let finalContactId = contactId || null;
    let resultObj;

    // If no conversation yet, ensure we have a contact (find or create), then send inbound
    if (!finalConversationId) {
      if (!finalContactId) {
        // find or create contact by email/phone
        const found = await findExistingContact({ email, phone });
        if (found?.id) {
          finalContactId = found.id;
          console.log('[send] Found contact:', finalContactId);
        } else {
          const created = await upsertContact({ name, email, phone, source, tags });
          finalContactId = created.id;
          console.log('[send] Created contact:', finalContactId);
        }
      }

      // First message → Inbound by contact (creates/attaches conversation; triggers Conversation AI)
      console.log('[send] Inbound by contact via Integrations API:', { contactId: finalContactId, provider });
      const inbound = await postInboundByContact({ contactId: finalContactId, text, provider });
      resultObj = inbound;
      finalConversationId = extractConversationId(inbound);
      console.log('[send] inbound conversationId:', finalConversationId);
    } else {
      // Follow-up → Outbound via MCP on existing thread
      console.log('[send] Outbound via MCP:', { conversationId: finalConversationId });
      const outbound = await sendOutboundOnThread({ conversationId: finalConversationId, text, messageType: 'Live_Chat' });
      resultObj = outbound;
    }

    if (!finalConversationId) {
      return res.status(502).json({ success: false, error: 'No conversationId returned' });
    }

    const messageId =
      pick(resultObj, 'data.messageId') ||
      pick(resultObj, 'messageId') ||
      pick(resultObj, 'message.id') ||
      'message_created';

    return res.status(200).json({
      success: true,
      data: {
        messageId,
        conversationId: finalConversationId,
        contactId: finalContactId,
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
