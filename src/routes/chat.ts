import express from 'express';
import type { Request, Response } from 'express';
import { createCRMClient } from '../lib/ghlMcp';
import {
  ChatSessionInput,
  ChatSessionResponse,
  ChatThreadInput,
  ChatThreadResponse,
  ChatMessageInput,
  ChatMessageResponse,
  Contact
} from '../types/crm';

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                           MCP helper (direct call)                         */
/* -------------------------------------------------------------------------- */

function pick(obj: any, path: string) {
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
}

function parseMcpEnvelope(status: number, rawText: string) {
  if (!rawText || typeof rawText !== 'string') throw new Error(`Empty MCP response [${status}]`);
  const ssePrefix = 'event: message\ndata: ';
  const body = rawText.startsWith(ssePrefix) ? rawText.slice(ssePrefix.length).trim() : rawText;

  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`Invalid MCP response [${status}]: ${body.slice(0, 240)}...`);
  }
  const base = parsed?.result ?? parsed;

  // unwrap nested { content:[{ type:'text', text:'{...}' }]}
  let current: any = base;
  for (let i = 0; i < 5; i++) {
    const textNode = current?.content?.[0]?.text;
    if (!textNode || typeof textNode !== 'string') break;
    try {
      current = JSON.parse(textNode);
    } catch {
      break;
    }
  }

  if (current?.error) {
    const msg = current.error?.message || 'Unknown MCP error';
    const code = current.error?.code || status;
    throw new Error(`${code}: ${msg}`);
  }
  return current;
}

async function callGHLMCP(toolName: string, input: Record<string, any> = {}) {
  const fetchImpl: typeof fetch =
    (globalThis as any).fetch ?? (await import('node-fetch')).default as unknown as typeof fetch;

  const mcpUrl = process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/';
  const pit = process.env.CRM_PIT;
  const locationId = process.env.CRM_LOCATION_ID;
  if (!pit || !locationId) throw new Error('Missing env: CRM_PIT or CRM_LOCATION_ID');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${pit}`,
    locationId,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream'
  };

  // Preferred envelope: { tool, input }
  let resp = await fetchImpl(mcpUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tool: toolName, input })
  });
  let txt = await resp.text();
  if (resp.ok) return parseMcpEnvelope(resp.status, txt);

  // Fallback JSON-RPC
  const rpc = {
    jsonrpc: '2.0',
    id: Date.now().toString(),
    method: 'tools/call',
    params: { name: toolName, arguments: input }
  };
  resp = await fetchImpl(mcpUrl, { method: 'POST', headers, body: JSON.stringify(rpc) });
  txt = await resp.text();
  if (!resp.ok) throw new Error(`GHL MCP Error [${resp.status}]: ${txt.slice(0, 240)}...`);
  return parseMcpEnvelope(resp.status, txt);
}

async function sendInboundVisitorMessage(params: { contactId: string; text: string; provider?: string }) {
  const { contactId, text, provider = 'live-chat' } = params;
  return callGHLMCP('conversations_add-an-inbound-message', {
    contactId,
    text,
    provider,                  // 'live-chat' | 'webchat'
    messageType: 'Live_Chat'   // ensures routing to Conversation AI for live chat
  });
}

async function sendOutboundMessage(params: { conversationId: string; text: string; messageType?: string }) {
  const { conversationId, text, messageType = 'Live_Chat' } = params;
  return callGHLMCP('conversations_send-a-new-message', {
    conversationId,
    text,
    messageType
  });
}

function extractConversationId(obj: any) {
  return pick(obj, 'data.conversationId') || pick(obj, 'conversationId') || pick(obj, 'conversation.id') || null;
}

/* -------------------------------------------------------------------------- */
/*                                 Endpoints                                  */
/* -------------------------------------------------------------------------- */

/**
 * Create or update a chat session (contact)
 * POST /chat/session
 */
router.post('/session', async (req: Request, res: Response) => {
  try {
    const sessionData: ChatSessionInput = req.body;

    if (!sessionData.name && !sessionData.email && !sessionData.phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least one of name, email, or phone is required',
        timestamp: new Date().toISOString()
      });
    }

    const crmClient = createCRMClient();

    const contactData = {
      name: sessionData.name,
      email: sessionData.email,
      phone: sessionData.phone,
      customFields: sessionData.customFields,
      source: sessionData.source || 'iKunnect Chat Widget',
      tags: sessionData.tags || ['iKunnect', 'Chat Lead']
    };

    console.log('[Chat Session] Upsert contact:', {
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone
    });

    const contactResult = await crmClient.upsertContact(contactData);

    if (!contactResult.success) {
      console.error('[Chat Session] Upsert failed:', contactResult.error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create chat session',
        details: contactResult.error,
        timestamp: new Date().toISOString()
      });
    }

    const contact = contactResult.data as Contact;

    const response: ChatSessionResponse = {
      contactId: contact.id,
      isNewContact: !contact.dateUpdated || contact.dateAdded === contact.dateUpdated,
      contact
    };

    console.log('[Chat Session] OK:', { contactId: contact.id, isNewContact: response.isNewContact });

    res.status(200).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Chat Session] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create chat session',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Create or find a conversation thread
 * POST /chat/thread
 */
router.post('/thread', async (req: Request, res: Response) => {
  try {
    const threadData: ChatThreadInput = req.body;

    if (!threadData.contactId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'contactId is required',
        timestamp: new Date().toISOString()
      });
    }

    const crmClient = createCRMClient();

    console.log('[Chat Thread] Find/create conversation for:', threadData.contactId);

    // Keep your existing abstraction for now
    const threadResult = await crmClient.findOrCreateConversation(
      threadData.contactId,
      threadData.channel || 'chat'
    );

    if (!threadResult.success) {
      console.error('[Chat Thread] Failed via client; trying inbound seed…', threadResult.error);

      // Fallback: seed an inbound message to force conversation creation
      const inbound = await sendInboundVisitorMessage({
        contactId: threadData.contactId,
        text: threadData.seed || '[session-start]',
        provider: 'live-chat'
      });
      const conversationId =
        extractConversationId(inbound) || pick(inbound, 'data.id') || pick(inbound, 'id');

      if (!conversationId) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to create conversation thread',
          details: threadResult.error || 'No conversation id returned',
          timestamp: new Date().toISOString()
        });
      }

      const response: ChatThreadResponse = {
        conversationId,
        isNewConversation: true
      };

      console.log('[Chat Thread] Fallback created thread:', { conversationId });
      return res.status(200).json({
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
    }

    const response: ChatThreadResponse = {
      conversationId: threadResult.data!.conversationId,
      isNewConversation: threadResult.data!.isNew
    };

    console.log('[Chat Thread] Ready:', response);

    res.status(200).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Chat Thread] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create conversation thread',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Send a message to a conversation
 * POST /chat/send
 *
 * - No conversationId  -> INBOUND visitor message by contactId (creates/attaches thread; triggers Conversation AI)
 * - With conversationId -> OUTBOUND agent/bot message on that thread
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const messageData: ChatMessageInput = req.body;

    if (!messageData.conversationId && !messageData.contactId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either conversationId or contactId is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!messageData.body || messageData.body.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message body is required and cannot be empty',
        timestamp: new Date().toISOString()
      });
    }

    const text = messageData.body.trim();
    const provider =
      (messageData.channel?.toLowerCase() === 'webchat' ? 'webchat' : 'live-chat');

    let finalConversationId = messageData.conversationId || null;
    let mcpObj: any;

    if (!finalConversationId) {
      // First customer message → INBOUND
      console.log('[Chat Send] INBOUND via MCP:', { contactId: messageData.contactId, provider });
      const inbound = await sendInboundVisitorMessage({
        contactId: messageData.contactId as string,
        text,
        provider
      });
      mcpObj = inbound;
      finalConversationId =
        extractConversationId(inbound) || pick(inbound, 'data.id') || pick(inbound, 'id');
    } else {
      // Follow-up → OUTBOUND
      console.log('[Chat Send] OUTBOUND via MCP:', { conversationId: finalConversationId });
      const outbound = await sendOutboundMessage({
        conversationId: finalConversationId,
        text,
        messageType: 'Live_Chat'
      });
      mcpObj = outbound;
    }

    if (!finalConversationId) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'No conversationId returned by MCP',
        timestamp: new Date().toISOString()
      });
    }

    const messageId =
      pick(mcpObj, 'data.messageId') ||
      pick(mcpObj, 'messageId') ||
      pick(mcpObj, 'message.id') ||
      'message_created';

    const response: ChatMessageResponse = {
      messageId,
      message: {
        id: messageId,
        conversationId: finalConversationId,
        body: text
      } as any
    };

    console.log('[Chat Send] OK:', { messageId, conversationId: finalConversationId });

    res.status(200).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Chat Send] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send message',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get messages from a conversation
 * GET /chat/messages/:conversationId
 */
router.get('/messages/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 25;

    if (!conversationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'conversationId is required',
        timestamp: new Date().toISOString()
      });
    }

    const crmClient = createCRMClient();

    console.log('[Chat Messages] Fetching:', { conversationId, limit });

    const messagesResult = await crmClient.getMessages(conversationId, limit);

    if (!messagesResult.success) {
      console.error('[Chat Messages] Failed:', messagesResult.error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch messages',
        details: messagesResult.error,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: messagesResult.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Chat Messages] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Search for a contact by email or phone
 * POST /chat/contact/search
 */
router.post('/contact/search', async (req: Request, res: Response) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either email or phone is required for contact search',
        timestamp: new Date().toISOString()
      });
    }

    const crmClient = createCRMClient();

    console.log('[Contact Search] Query:', { email, phone });

    const searchResult = await crmClient.searchContact(email, phone);

    if (!searchResult.success) {
      console.error('[Contact Search] Failed:', searchResult.error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search for contact',
        details: searchResult.error,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: {
        contacts: searchResult.data || [],
        total: searchResult.data?.length || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Contact Search] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search for contact',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
