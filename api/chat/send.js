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

  async function sendInboundMessage({ contactId, text, provider = 'web_chat' }) {
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

  function extractConversationId(obj) {
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

  try {
    console.log('Send endpoint called:', req.method, req.url);

    if (req.method === 'GET') {
      return res.json({ 
        ok: true, 
        route: '/api/chat/send', 
        expect: 'POST JSON { contactId+body } or { conversationId+body }' 
      });
    }

    if (req.method === 'POST') {
      const { conversationId, contactId, body: msg, channel } = req.body;
      
      console.log('Send POST data:', { conversationId, contactId, msg, channel });
      
      if (!msg) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message body is required' 
        });
      }

      const text = String(msg).trim();
      if (!text) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message body cannot be empty' 
        });
      }

      const provider = (channel && String(channel).toLowerCase() === 'webchat') ? 'webchat' : 'web_chat';
      let finalConversationId = conversationId || null;
      let result;

      if (!finalConversationId) {
        if (!contactId) {
          return res.status(400).json({ 
            success: false, 
            error: 'contactId is required when no conversationId is provided' 
          });
        }
        
        console.log('[SEND] First message - using inbound API for contactId:', contactId);
        const inbound = await sendInboundMessage({ con