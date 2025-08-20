// api/chat/send.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  sendInboundVisitorMessage,
  sendOutboundMessage,
  extractConversationId,
  pick
} from '../_utils/mcp';

function setCORS(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, locationId, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { conversationId, body, contactId, channel } = (req.body || {}) as {
      conversationId?: string;
      contactId?: string;
      body?: string;
      channel?: string; // 'chat' | 'webchat' | etc.
    };

    if (!body || !contactId) {
      return res.status(400).json({ success: false, error: 'Message body and contactId are required' });
    }

    const text = String(body).trim();
    if (!text) return res.status(400).json({ success: false, error: 'Message body cannot be empty' });

    const provider = (channel?.toLowerCase() === 'webchat') ? 'webchat' : 'live-chat';

    let finalConversationId = conversationId || null;
    let mcpObj: any;

    if (!finalConversationId) {
      // FIRST customer message → INBOUND (creates/attaches thread + triggers Conversation AI)
      const inbound = await sendInboundVisitorMessage({ contactId, text, provider });
      mcpObj = inbound;
      finalConversationId =
        extractConversationId(inbound) || pick(inbound, 'data.id') || pick(inbound, 'id');
    } else {
      // Follow-up → OUTBOUND (requires conversationId)
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
  } catch (err: any) {
    console.error('[api/chat/send] Error:', err);
    return res.status(500).json({ success: false, error: `Message sending failed: ${err.message}` });
  }
}
