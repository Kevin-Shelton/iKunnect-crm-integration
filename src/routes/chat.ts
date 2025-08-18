import express from 'express';
import { createCRMClient } from '../lib/crmMcp';
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

/**
 * Create or update a chat session (contact)
 * POST /chat/session
 */
router.post('/session', async (req, res) => {
  try {
    const sessionData: ChatSessionInput = req.body;
    
    // Validate required fields
    if (!sessionData.name && !sessionData.email && !sessionData.phone) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least one of name, email, or phone is required',
        timestamp: new Date().toISOString()
      });
    }

    const crmClient = createCRMClient();
    
    // Prepare contact data for CRM
    const contactData = {
      name: sessionData.name,
      email: sessionData.email,
      phone: sessionData.phone,
      customFields: sessionData.customFields,
      source: sessionData.source || 'iKunnect Chat Widget',
      tags: sessionData.tags || ['iKunnect', 'Chat Lead']
    };

    console.log('[Chat Session] Creating/updating contact:', { 
      name: contactData.name, 
      email: contactData.email, 
      phone: contactData.phone 
    });

    // Create or update contact in CRM
    const contactResult = await crmClient.upsertContact(contactData);
    
    if (!contactResult.success) {
      console.error('[Chat Session] Failed to create/update contact:', contactResult.error);
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
      contact: contact
    };

    console.log('[Chat Session] Session created successfully:', { 
      contactId: contact.id, 
      isNewContact: response.isNewContact 
    });

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
router.post('/thread', async (req, res) => {
  try {
    const threadData: ChatThreadInput = req.body;
    
    // Validate required fields
    if (!threadData.contactId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'contactId is required',
        timestamp: new Date().toISOString()
      });
    }

    const crmClient = createCRMClient();
    
    console.log('[Chat Thread] Finding/creating conversation for contact:', threadData.contactId);

    // Find or create conversation thread
    const threadResult = await crmClient.findOrCreateConversation(
      threadData.contactId, 
      threadData.channel || 'chat'
    );
    
    if (!threadResult.success) {
      console.error('[Chat Thread] Failed to create/find thread:', threadResult.error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create conversation thread',
        details: threadResult.error,
        timestamp: new Date().toISOString()
      });
    }

    const response: ChatThreadResponse = {
      conversationId: threadResult.data!.conversationId,
      isNewConversation: threadResult.data!.isNew
    };

    console.log('[Chat Thread] Thread ready:', { 
      conversationId: response.conversationId, 
      isNewConversation: response.isNewConversation 
    });

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
 */
router.post('/send', async (req, res) => {
  try {
    const messageData: ChatMessageInput = req.body;
    
    // Validate required fields
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

    const crmClient = createCRMClient();
    
    // Prepare message for CRM
    const crmMessageData = {
      conversationId: messageData.conversationId,
      contactId: messageData.contactId,
      body: messageData.body.trim(),
      channel: (messageData.channel || 'Chat') as any,
      direction: 'inbound' as const
    };

    console.log('[Chat Send] Sending message:', { 
      conversationId: crmMessageData.conversationId,
      contactId: crmMessageData.contactId,
      bodyLength: crmMessageData.body.length,
      channel: crmMessageData.channel
    });

    // Send message via CRM
    const messageResult = await crmClient.sendMessage(crmMessageData);
    
    if (!messageResult.success) {
      console.error('[Chat Send] Failed to send message:', messageResult.error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to send message',
        details: messageResult.error,
        timestamp: new Date().toISOString()
      });
    }

    const response: ChatMessageResponse = {
      messageId: messageResult.data!.id,
      message: messageResult.data!
    };

    console.log('[Chat Send] Message sent successfully:', { 
      messageId: response.messageId,
      conversationId: messageResult.data!.conversationId
    });

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
router.get('/messages/:conversationId', async (req, res) => {
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
    
    console.log('[Chat Messages] Fetching messages:', { conversationId, limit });

    // Get messages from CRM
    const messagesResult = await crmClient.getMessages(conversationId, limit);
    
    if (!messagesResult.success) {
      console.error('[Chat Messages] Failed to fetch messages:', messagesResult.error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch messages',
        details: messagesResult.error,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[Chat Messages] Messages fetched successfully:', { 
      conversationId, 
      messageCount: messagesResult.data?.items?.length || 0 
    });

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
router.post('/contact/search', async (req, res) => {
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
    
    console.log('[Contact Search] Searching for contact:', { email, phone });

    // Search for contact in CRM
    const searchResult = await crmClient.searchContact(email, phone);
    
    if (!searchResult.success) {
      console.error('[Contact Search] Search failed:', searchResult.error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search for contact',
        details: searchResult.error,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[Contact Search] Search completed:', { 
      email, 
      phone, 
      resultsFound: searchResult.data?.length || 0 
    });

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

