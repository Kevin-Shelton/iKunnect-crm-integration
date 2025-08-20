// GoHighLevel MCP Integration API — Correct Live_Chat flow
// - Find/create contact via MCP where needed
// - First message: Integrations API /conversations/messages/inbound (by contactId)
// - Follow-ups: MCP conversations_send-a-new-message (by conversationId)

export default async function handler(req, res) {
  // -------- CORS --------
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // set your domain if using cookies
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, locationId, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { method, url } = req;
  const path = (url || '').split('?')[0];

  // -------- Utilities --------
  function pick(obj, pathStr) {
    return pathStr.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
  }
  const nowIso = () => new Date().toISOString();

  // Parse SSE/embedded content wrappers used by MCP responses
  function parseMcpEnvelopeText(status, rawText) {
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

  // -------- MCP call (JSON-RPC, keeps your original approach) --------
  async function callGHLMCP(toolName, arguments_) {
    const fetch = (await import('node-fetch')).default;

    const mcpUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/';
    const pit = process.env.CRM_PIT;
    const locationId = process.env.CRM_LOCATION_ID;

    if (!pit || !locationId) {
      throw new Error('Missing required environment variables: CRM_PIT or CRM_LOCATION_ID');
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
      throw new Error(`GHL MCP Error: ${response.status} - ${responseText.slice(0, 240)}...`);
    }
    return parseMcpEnvelopeText(response.status, responseText);
  }

  // -------- Integrations API: first inbound message by contactId --------
  async function postInboundByContact({ contactId, text, provider }) {
    const fetch = (await import('node-fetch')).default;

    const base = process.env.CRM_BASE_URL || 'https://services.leadconnectorhq.com';
    const pit = process.env.CRM_PIT;
    const locationId = process.env.CRM_LOCATION_ID;
    if (!pit || !locationId) throw new Error('Missing required environment variables: CRM_PIT or CRM_LOCATION_ID');

    const payload = {
      contactId,
      message: text,
      type: 'Live_Chat',
      provider // 'live-chat' | 'webchat'
    };

    const headers = {
      Authorization: `Bearer ${pit}`,
      locationId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Version: '2021-07-28'
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

  // -------- Helpers you already had (lightly tweaked) --------
  function extractContactFromMCPResponse(mcpResult) {
    if (!mcpResult) return null;
    if (mcpResult.content && mcpResult.content[0]?.type === 'text') {
      try {
        const parsed = JSON.parse(mcpResult.content[0].text);
        if (parsed.content && parsed.content[0]?.text) {
          const inner = JSON.parse(parsed.content[0].text);
          if (inner.success === false) throw new Error(inner.data?.message || inner.message || 'Operation failed');
          return inner.data?.contact || inner.contact || inner.data;
        }
        if (parsed.success === false) throw new Error(parsed.data?.message || parsed.message || 'Operation failed');
        return parsed.data?.contact || parsed.contact || parsed.data || parsed;
      } catch {
        return null;
      }
    }
    return mcpResult.contact || mcpResult.data || mcpResult;
  }

  async function findExistingContact(email, phone) {
    try {
      const q = email || phone;
      if (!q) return null;

      const searchResult = await callGHLMCP('contacts_get-contacts', {
        locationId: process.env.CRM_LOCATION_ID,
        query: q,
        limit: 25
      });

      const contacts =
        pick(searchResult, 'data.contacts') ||
        pick(searchResult, 'contacts') ||
        (Array.isArray(searchResult?.data) ? searchResult.data : []) ||
        [];

      const exact =
        (email && contacts.find(c => (c.email || '').toLowerCase() === String(email).toLowerCase())) ||
        (phone && contacts.find(c => (c.phone || '') === phone));
      return exact || contacts[0] || null;
    } catch (e) {
      console.log('[CONTACT SEARCH] Search failed:', e.message);
      return null;
    }
  }

  async function upsertContact(firstName, lastName, email, phone) {
    const r = await callGHLMCP('contacts_upsert-contact', {
      firstName,
      lastName,
      email: email || '',
      phone: phone || '',
      source: 'iKunnect Live Chat Widget',
      tags: ['Live Chat', 'Web Visitor', 'iKunnect Integration']
    });
    const contact = extractContactFromMCPResponse(r) || r;
    if (!contact?.id) throw new Error('Contact upsert returned no id');
    return contact;
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

  // ================== ROUTES ==================

  // Simple status
  if (method === 'GET' && path === '/api') {
    return res.json({
      name: 'iKunnect GoHighLevel MCP Integration API',
      version: '34.0.0',
      description: 'Live_Chat: inbound first via Integrations API; follow-ups via MCP.',
      status: 'operational',
      timestamp: nowIso()
    });
  }

  if (method === 'GET' && path === '/api/hello') {
    return res.json({ message: 'Hello World!', timestamp: nowIso(), status: 'working' });
  }

  if (method === 'GET' && path === '/api/health') {
    try {
      await callGHLMCP('locations_get-location', { locationId: process.env.CRM_LOCATION_ID });
      return res.json({
        success: true,
        message: 'GoHighLevel MCP Server connected successfully',
        timestamp: nowIso(),
        ghl: {
          connected: true,
          locationId: process.env.CRM_LOCATION_ID,
          mcpServer: process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/'
        }
      });
    } catch (error) {
      return res.json({
        success: false,
        message: 'MCP Server connection failed',
        timestamp: nowIso(),
        error: error.message
      });
    }
  }

  // Create/find contact (unchanged behavior)
  if (method === 'POST' && path === '/api/chat/session') {
    const { name, email, phone } = req.body || {};
    if (!name && !email && !phone) {
      return res.status(400).json({ success: false, error: 'At least one of name, email, or phone is required' });
    }
    const [firstName, ...rest] = String(name || '').trim().split(/\s+/);
    const lastName = rest.join(' ');
    try {
      let contact = await findExistingContact(email, phone);
      let isNewContact = false;
      if (!contact) {
        contact = await upsertContact(firstName, lastName, email, phone);
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
    } catch (error) {
      return res.status(500).json({ success: false, error: `Contact handling failed: ${error.message}` });
    }
  }

  // ENSURE THREAD: previously returned "pending_*"; now it seeds a real inbound and returns a real conversationId
  if (method === 'POST' && path === '/api/chat/thread') {
    const { contactId, seed, channel } = req.body || {};
    if (!contactId) return res.status(400).json({ success: false, error: 'Contact ID is required' });

    try {
      const provider = (channel && String(channel).toLowerCase() === 'webchat') ? 'webchat' : 'live-chat';
      const inbound = await postInboundByContact({
        contactId,
        text: seed || '[session-start]',
        provider
      });
      const conversationId = extractConversationId(inbound);
      if (!conversationId) {
        return res.status(502).json({ success: false, error: 'No conversationId returned by inbound API' });
      }
      return res.json({
        success: true,
        data: {
          conversationId,
          isNewConversation: true,
          contactId,
          conversation: {
            id: conversationId,
            type: 'Live_Chat',
            status: 'open'
          }
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: `Thread init failed: ${error.message}` });
    }
  }

  // SEND MESSAGE:
  // - if no conversationId: first message -> inbound by contactId (creates/attaches thread + triggers AI)
  // - if conversationId present: follow-up -> MCP send-a-new-message on that thread
  if (method === 'POST' && path === '/api/chat/send') {
    const { conversationId, body, contactId, channel } = req.body || {};

    if (!body) return res.status(400).json({ success: false, error: 'Message body is required' });

    const text = String(body).trim();
    if (!text) return res.status(400).json({ success: false, error: 'Message body cannot be empty' });

    try {
      const provider = (channel && String(channel).toLowerCase() === 'webchat') ? 'webchat' : 'live-chat';

      let finalConversationId = conversationId || null;
      let result;

      if (!finalConversationId) {
        if (!contactId) {
          return res.status(400).json({ success: false, error: 'contactId is required when no conversationId is provided' });
        }
        // FIRST message -> inbound by contact
        const inbound = await postInboundByContact({ contactId, text, provider });
        result = inbound;
        finalConversationId = extractConversationId(inbound);
      } else {
        // FOLLOW-UP -> MCP send on existing thread
        result = await callGHLMCP('conversations_send-a-new-message', {
          conversationId: finalConversationId,
          text,
          messageType: 'Live_Chat'
        });
      }

      if (!finalConversationId) {
        return res.status(502).json({ success: false, error: 'No conversationId returned' });
      }

      const messageId =
        pick(result, 'data.messageId') ||
        pick(result, 'messageId') ||
        pick(result, 'message.id') ||
        'message_created';

      return res.json({
        success: true,
        data: {
          messageId,
          conversationId: finalConversationId,
          contactId,
          body: text,
          messageType: 'Live_Chat',
          timestamp: nowIso(),
          status: 'delivered'
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: `Message sending failed: ${error.message}` });
    }
  }

  // Deprecated note
  if (method === 'POST' && path === '/api/bot/process') {
    return res.json({
      success: true,
      data: {
        response: 'Deprecated. Conversation AI responds automatically.',
        action: 'deprecated',
        confidence: 1.0,
        timestamp: nowIso()
      }
    });
  }

  // 404
  return res.status(404).json({ success: false, error: 'API endpoint not found', path, method });
}
