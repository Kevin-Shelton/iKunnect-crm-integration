import { sendInboundMessage, extractConversationId, callMCP } from '../_lib/crm.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({ ok: true, route: '/api/chat/send', expect: 'POST JSON { contactId+body } or { conversationId+body }' });
  }

  if (req.method === 'POST') {
    const { conversationId, contactId, body: msg, channel } = req.body;
    
    if (!msg) {
      return res.status(400).json({ success: false, error: 'Message body is required' });
    }

    const text = String(msg).trim();
    if (!text) {
      return res.status(400).json({ success: false, error: 'Message body cannot be empty' });
    }

    try {
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
        const inbound = await sendInboundMessage({ contactId, text, provider });
        result = inbound;
        finalConversationId = extractConversationId(inbound);
        console.log('[SEND] First message created conversationId:', finalConversationId);
      } else {
        console.log('[SEND] Follow-up message - using MCP for conversationId:', finalConversationId);
        result = await callMCP('conversations_send-a-new-message', {
          conversationId: finalConversationId,
          text,
          messageType: 'Live_Chat',
          type: 'Live_Chat'
        });
      }

      if (!finalConversationId) {
        console.error('[SEND] No conversationId after sending:', result);
        return res.status(502).json({ 
          success: false, 
          error: 'No conversationId returned',
          debug: { result, extractedId: finalConversationId }
        });
      }

      const messageId = result?.data?.messageId || result?.messageId || result?.message?.id || 'message_created';

      return res.json({
        success: true,
        data: {
          messageId,
          conversationId: finalConversationId,
          contactId,
          body: text,
          messageType: 'Live_Chat',
          timestamp: new Date().toISOString(),
          status: 'delivered'
        }
      });
    } catch (error) {
      console.error('[SEND] Message sending failed:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Message sending failed: ${error.message}` 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}