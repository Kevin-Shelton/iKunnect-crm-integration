// GoHighLevel MCP Integration – Single Catch-All for /api/*
// Flow:
//   - contacts: MCP (find/create)
//   - first message: Integrations API /conversations/messages/inbound (by contactId, Live_Chat)
//   - follow-ups: MCP conversations_send-a-new-message (by conversationId)

export default async function handler(req, res) {
  // -------- CORS --------
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // set your domain if using cookies
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, locationId, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') return res.status(200).end();

  // -------- Path normalize (handles trailing slashes) --------
  const u = new URL(req.url, 'https://dummy.local');
  let path = u.pathname;
  if (path.length > 1 && path.endsWith('/')) path = path.replace(/\/+$/, '');

  const method = req.method;
  const nowIso = () => new Date().toISOString();

  console.log(`[api] ${method} ${path}`);

  // -------- Utils --------
  function pick(obj, pathStr) {
    return pathStr.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
  }

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

  // -------- MCP JSON-RPC call --------
  async function callMCP(toolName, arguments_) {
    const fetch = (await import('node-fetch')).default;
    const mcpUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/';
    const pit = process.env.CRM_PIT;
    const locationId = process.env.CRM_LOCATION_ID;
    if (!pit || !locationId) throw new Error('Missing required env: CRM_PIT or CRM_LOCATION_ID');

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

  // -------- Enhanced Integrations API: first inbound message by contactId --------
  async function postInboundByContact({ contactId, text, provider }) {
    const fetch = (await import('node-fetch')).default;
    const base = process.env.CRM_BASE_URL || 'https://services.leadconnectorhq.com';
    const pit = process.env.CRM_PIT;
    const locationId = process.env.CRM_LOCATION_ID;
    if (!pit || !locationId) throw new Error('Missing required env: CRM_PIT or CRM_LOCATION_ID');

    // Try Method 1: Regular messages endpoint
    try {
      console.log('[INBOUND] Trying regular messages endpoint...');
      const payload1 = {
        type: 'Live_Chat',
        contactId,
        message: text,
        locationId: locationId,
        provider: provider || 'live-chat'
      };

      const headers1 = {
        Authorization: `Bearer ${pit}`,
        locationId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: '2021-07-28'
      };

      console.log('[INBOUND] Method 1 payload:', JSON.stringify(payload1, null, 2));

      const resp1 = await fetch(`${base}/conversations/messages`, {
        method: 'POST',
        headers: headers1,
        body: JSON.stringify(payload1)
      });

      const txt1 = await resp1.text();
      console.log('[INBOUND] Method 1 response:', resp1.status, txt1);
      
      if (resp1.ok) {
        const json1 = JSON.parse(txt1);
        console.log('[INBOUND] Method 1 success:', JSON.stringify(json1, null, 2));
        return json1;
      }
    } catch (err) {
      console.log('[INBOUND] Method 1 failed:', err.message);
    }

    // Try Method 2: Your original inbound endpoint
    try {
      console.log('[INBOUND] Trying inbound endpoint...');
      const payload2 = {
        contactId,
        message: text,
        type: 'Live_Chat',
        provider: provider || 'live-chat',
        locationId: locationId,
        source: 'api'
      };

      const headers2 = {
        Authorization: `Bearer ${pit}`,
        locationId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: '2021-07-28'
      };

      console.log('[INBOUND] Method 2 payload:', JSON.stringify(payload2, null, 2));

      const resp2 = await fetch(`${base}/conversations/messages/inbound`, {
        method: 'POST',
        headers: headers2,
        body: JSON.stringify(payload2)
      });

      const txt2 = await resp2.text();
      console.log('[INBOUND] Method 2 response:', resp2.status, txt2);
      
      let json2;
      try { json2 = JSON.parse(txt2); } catch { throw new Error(`Inbound API bad response [${resp2.status}]: ${txt2.slice(0,240)}...`); }
      
      if (!resp2.ok) {
        console.error('[INBOUND] Method 2 error:', json2);
        throw new Error(json2?.message || json2?.error || `Inbound API ${resp2.status}`);
      }

      console.log('[INBOUND] Method 2 success:', JSON.stringify(json2, null, 2));
      return json2;
      
    } catch (err) {
      console.error('[INBOUND] Both methods failed. Last error:', err.message);
      throw err;
    }
  }

  // -------- Contact helpers --------
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
      const r = await callMCP('contacts_get-contacts', {
        locationId: process.env.CRM_LOCATION_ID,
        query: q,
        limit: 25
      });
      const contacts =
        pick(r, 'data.contacts') ||
        pick(r, 'contacts') ||
        (Array.isArray(r?.data) ? r.data : []) ||
        [];
      const exact =
        (email && contacts.find(c => (c.email || '').toLowerCase() === String(email).toLowerCase())) ||
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
    const contact = extractContactFromMCPResponse(r) || r;
    if (!contact?.id) throw new Error('Contact upsert returned no id');
    return contact;
  }

  // Enhanced extractConversationId with more logging and paths
  function extractConversationId(obj) {
    console.log('[EXTRACT] Input object:', JSON.stringify(obj, null, 2));
    
    const paths = [
      'data.conversationId',
      'conversationId', 
      'conversation.id',
      'data.conversation.id',
      'data.id',
      'id',
      'message.conversationId',
      'result.conversationId',
      'response.conversationId',
      'data.message.conversationId',
      'messageId', // Sometimes the messageId is actually the conversationId
      'data.messageId'
    ];
    
    for (const path of paths) {
      const value = pick(obj, path);
      console.log(`[EXTRACT] Checking path '${path}':`, value);
      if (value) {
        console.log(`[EXTRACT] Found conversationId at '${path}':`, value);
        return value;
      }
    }
    
    console.log('[EXTRACT] No conversationId found in any expected path');
    return null;
  }

  // ================= ROUTES =================

  // Simple status
  if (method === 'GET' && path === '/api') {
    return res.json({
      name: 'iKunnect ↔ GoHighLevel MCP Integration',
      version: 'live-chat-flow-1.2-debug',
      status: 'operational',
      timestamp: nowIso()
    });
  }

  if (method === 'GET' && path === '/api/hello') {
    return res.json({ message: 'Hello World!', timestamp: nowIso(), status: 'working' });
  }

  if (method === 'GET' && path === '/api/health') {
    try {
      await callMCP('locations_get-location', { locationId: process.env.CRM_LOCATION_ID });
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

  // GET handshakes (so you can open these URLs in a browser to confirm routing)
  if (method === 'GET' && path === '/api/chat/session') {
    return res.json({ ok: true, route: '/api/chat/session', expect: 'POST JSON { name/email/phone }' });
  }
  if (method === 'GET' && path === '/api/chat/send') {
    return res.json({ ok: true, route: '/api/chat/send', expect: 'POST JSON { contactId+body } or { conversationId+body }' });
  }
  if (method === 'GET' && path === '/api/chat/thread') {
    return res.json({ ok: true, route: '/api/chat/thread', expect: 'POST JSON { contactId }' });
  }

  // Create/find contact
  if (method === 'POST' && path === '/api/chat/session') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    const { name, email, phone } = body;
    if (!name && !email && !phone) {
      return res.status(400).json({ success: false, error: 'At least one of name, email, or phone is required' });
    }
    const [firstName, ...rest] = String(name || '').trim().split(/\s+/);
    const lastName = rest.join(' ');
    try {
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
    } catch (error) {
      return res.status(500).json({ success: false, error: `Contact handling failed: ${error.message}` });
    }
  }

  // Create/ensure a REAL conversation (post inbound seed)
  if (method === 'POST' && path === '/api/chat/thread') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    const { contactId, seed, channel } = body;
    if (!contactId) return res.status(400).json({ success: false, error: 'Contact ID is required' });
    
    try {
      console.log('[THREAD] Creating thread for contactId:', contactId);
      const provider = (channel && String(channel).toLowerCase() === 'webchat') ? 'webchat' : 'live-chat';
      const inbound = await postInboundByContact({
        contactId,
        text: seed || '[session-start]',
        provider
      });
      
      console.log('[THREAD] Inbound response received:', JSON.stringify(inbound, null, 2));
      
      const conversationId = extractConversationId(inbound);
      console.log('[THREAD] Extracted conversationId:', conversationId);
      
      if (!conversationId) {
        console.error('[THREAD] No conversationId found in response:', inbound);
        return res.status(502).json({ 
          success: false, 
          error: 'No conversationId returned by inbound API',
          debug: {
            inboundResponse: inbound,
            extractedId: conversationId
          }
        });
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
      console.error('[THREAD] Thread creation failed:', error);
      return res.status(500).json({ success: false, error: `Thread init failed: ${error.message}` });
    }
  }

  // Send message:
  //   - No conversationId => first message -> inbound by contactId (creates/attaches thread + triggers AI)
  //   - Has conversationId => follow-up -> MCP send on thread
  if (method === 'POST' && path === '/api/chat/send') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    const { conversationId, contactId, body: msg, channel } = body;
    if (!msg) return res.status(400).json({ success: false, error: 'Message body is required' });

    const text = String(msg).trim();
    if (!text) return res.status(400).json({ success: false, error: 'Message body cannot be empty' });

    try {
      const provider = (channel && String(channel).toLowerCase() === 'webchat') ? 'webchat' : 'live-chat';

      let finalConversationId = conversationId || null;
      let result;

      if (!finalConversationId) {
        if (!contactId) {
          return res.status(400).json({ success: false, error: 'contactId is required when no conversationId is provided' });
        }
        console.log('[SEND] First message - using inbound API for contactId:', contactId);
        // FIRST message -> inbound by contact
        const inbound = await postInboundByContact({ contactId, text, provider });
        result = inbound;
        finalConversationId = extractConversationId(inbound);
        console.log('[SEND] First message created conversationId:', finalConversationId);
      } else {
        console.log('[SEND] Follow-up message - using MCP for conversationId:', finalConversationId);
        // FOLLOW-UP -> MCP send on existing thread
        result = await callMCP('conversations_send-a-new-message', {
          conversationId: finalConversationId,
          text,
          messageType: 'Live_Chat'
        });
      }

      if (!finalConversationId) {
        console.error('[SEND] No conversationId after sending:', result);
        return res.status(502).json({ 
          success: false, 
          error: 'No conversationId returned',
          debug: {
            result: result,
            extractedId: finalConversationId
          }
        });
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
      console.error('[SEND] Message sending failed:', error);
      return res.status(500).json({ success: false, error: `Message sending failed: ${error.message}` });
    }
  }

  // 404
  return res.status(404).json({ success: false, error: 'API endpoint not found', path, method });
}