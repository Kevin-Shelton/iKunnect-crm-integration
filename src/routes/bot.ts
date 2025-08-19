// Bot Routes for Automated Chat Responses
import { Router, Request, Response } from 'express';
import { GHLMCPClient } from '../lib/ghlMcp';
import SimpleBotLogic, { BotContext } from '../lib/botLogic';
import { 
  asyncHandler, 
  AppError, 
  createValidationError, 
  createGHLError 
} from '../middleware/errorHandler';
import { 
  validateRequired, 
  rateLimit 
} from '../middleware/security';

const router = Router();

// Bot-specific rate limiting
const botRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 bot requests per minute
  message: 'Too many bot requests, please slow down'
});

router.use(botRateLimit);

/**
 * POST /bot/process
 * Process a user message through the bot logic and return a response
 * Body: { message, contactId, conversationId, sessionData? }
 * Returns: { response, actions?, metadata? }
 */
router.post('/process',
  validateRequired(['message', 'contactId', 'conversationId']),
  asyncHandler(async (req: Request, res: Response) => {
    const ghlClient: GHLMCPClient = req.app.locals.ghlClient;
    const { message, contactId, conversationId, sessionData } = req.body;

    console.log('[Bot Process] Processing message for contact:', contactId);

    try {
      // Get contact information for context
      const contactResult = await ghlClient.getContact(contactId);
      const contact = contactResult.success ? contactResult.data : undefined;

      // Get recent messages for context
      const messagesResult = await ghlClient.getMessages(conversationId, 5);
      const recentMessages = messagesResult.success ? messagesResult.data?.items : [];
      const lastMessage = recentMessages && recentMessages.length > 0 ? recentMessages[0] : undefined;

      // Build bot context
      const context: BotContext = {
        contactId,
        conversationId,
        contact,
        lastMessage,
        sessionData
      };

      // Initialize bot logic
      const bot = new SimpleBotLogic(ghlClient);

      // Process the message
      const botResponse = await bot.processMessage(message, context);

      // Execute any actions
      if (botResponse.actions && botResponse.actions.length > 0) {
        await bot.executeActions(botResponse.actions, context);
      }

      // Send bot response to the conversation
      const sendResult = await ghlClient.sendMessage({
        conversationId,
        body: botResponse.message,
        channel: 'chat'
      });

      if (!sendResult.success) {
        console.warn('[Bot Process] Failed to send bot response:', sendResult.error);
      }

      res.json({
        success: true,
        data: {
          response: botResponse.message,
          actions: botResponse.actions,
          metadata: botResponse.metadata,
          messageId: sendResult.success ? sendResult.data?.id : undefined,
          context: {
            contactId,
            conversationId,
            hasContact: !!contact,
            contactName: contact?.firstName || contact?.name
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[Bot Process] Error:', error);
      throw error instanceof AppError ? error : createGHLError('Bot processing failed', error);
    }
  })
);

/**
 * POST /bot/auto-respond
 * Automatically process and respond to a new message in a conversation
 * Body: { conversationId, triggerMessage?, autoSend? }
 * Returns: { processed, response?, messageId? }
 */
router.post('/auto-respond',
  validateRequired(['conversationId']),
  asyncHandler(async (req: Request, res: Response) => {
    const ghlClient: GHLMCPClient = req.app.locals.ghlClient;
    const { conversationId, triggerMessage, autoSend = true } = req.body;

    console.log('[Bot Auto-Respond] Processing conversation:', conversationId);

    try {
      // Get conversation details
      const conversationResult = await ghlClient.getConversation(conversationId);
      
      if (!conversationResult.success) {
        throw createGHLError('Failed to get conversation details', conversationResult.error);
      }

      const conversation = conversationResult.data;
      const contactId = conversation.contactId;

      // Get recent messages to find the latest user message
      const messagesResult = await ghlClient.getMessages(conversationId, 10);
      
      if (!messagesResult.success) {
        throw createGHLError('Failed to get conversation messages', messagesResult.error);
      }

      const messages = messagesResult.data?.items || [];
      
      // Find the most recent inbound message (from user)
      const latestUserMessage = triggerMessage || 
        messages.find(msg => msg.direction === 'inbound')?.body;

      if (!latestUserMessage) {
        return res.json({
          success: true,
          data: {
            processed: false,
            reason: 'No user message found to respond to'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Get contact information
      const contactResult = await ghlClient.getContact(contactId);
      const contact = contactResult.success ? contactResult.data : undefined;

      // Build context
      const context: BotContext = {
        contactId,
        conversationId,
        contact,
        lastMessage: messages[0]
      };

      // Process with bot logic
      const bot = new SimpleBotLogic(ghlClient);
      const botResponse = await bot.processMessage(latestUserMessage, context);

      // Execute actions
      if (botResponse.actions && botResponse.actions.length > 0) {
        await bot.executeActions(botResponse.actions, context);
      }

      let messageId: string | undefined;

      // Send response if auto-send is enabled
      if (autoSend) {
        const sendResult = await ghlClient.sendMessage({
          conversationId,
          body: botResponse.message,
          channel: 'chat'
        });

        if (sendResult.success) {
          messageId = sendResult.data?.id;
        } else {
          console.warn('[Bot Auto-Respond] Failed to send response:', sendResult.error);
        }
      }

      res.json({
        success: true,
        data: {
          processed: true,
          response: botResponse.message,
          messageId,
          actions: botResponse.actions,
          metadata: botResponse.metadata,
          triggerMessage: latestUserMessage,
          autoSent: autoSend && !!messageId
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[Bot Auto-Respond] Error:', error);
      throw error instanceof AppError ? error : createGHLError('Auto-response failed', error);
    }
  })
);

/**
 * GET /bot/context/:conversationId
 * Get bot context information for a conversation
 * Returns: { context, contact, recentMessages, suggestions? }
 */
router.get('/context/:conversationId',
  asyncHandler(async (req: Request, res: Response) => {
    const ghlClient: GHLMCPClient = req.app.locals.ghlClient;
    const { conversationId } = req.params;

    if (!conversationId) {
      throw createValidationError('Conversation ID is required');
    }

    console.log('[Bot Context] Getting context for conversation:', conversationId);

    try {
      // Get conversation details
      const conversationResult = await ghlClient.getConversation(conversationId);
      
      if (!conversationResult.success) {
        throw createGHLError('Failed to get conversation', conversationResult.error);
      }

      const conversation = conversationResult.data;
      const contactId = conversation.contactId;

      // Get contact information
      const contactResult = await ghlClient.getContact(contactId);
      const contact = contactResult.success ? contactResult.data : undefined;

      // Get recent messages
      const messagesResult = await ghlClient.getMessages(conversationId, 10);
      const recentMessages = messagesResult.success ? messagesResult.data?.items : [];

      // Generate context suggestions
      const suggestions = generateContextSuggestions(contact, recentMessages);

      res.json({
        success: true,
        data: {
          context: {
            conversationId,
            contactId,
            status: conversation.status,
            channel: conversation.channel
          },
          contact,
          recentMessages,
          suggestions,
          messageCount: recentMessages.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[Bot Context] Error:', error);
      throw error instanceof AppError ? error : createGHLError('Context retrieval failed', error);
    }
  })
);

/**
 * Generate contextual suggestions based on contact and conversation history
 */
function generateContextSuggestions(contact: any, messages: any[]): string[] {
  const suggestions: string[] = [];

  // Contact-based suggestions
  if (contact) {
    if (!contact.email) {
      suggestions.push("Consider asking for the customer's email address");
    }
    if (!contact.phone) {
      suggestions.push("Consider collecting a phone number for follow-up");
    }
    if (contact.firstName) {
      suggestions.push(`Use personalized greeting: "Hi ${contact.firstName}!"`);
    }
  }

  // Message history-based suggestions
  if (messages && messages.length > 0) {
    const recentUserMessages = messages
      .filter(msg => msg.direction === 'inbound')
      .slice(0, 3);

    const hasBusinessKeywords = recentUserMessages.some(msg => 
      msg.body && (
        msg.body.toLowerCase().includes('business') ||
        msg.body.toLowerCase().includes('service') ||
        msg.body.toLowerCase().includes('price') ||
        msg.body.toLowerCase().includes('demo')
      )
    );

    if (hasBusinessKeywords) {
      suggestions.push("Customer seems interested in business services - consider creating an opportunity");
    }

    const hasContactInfo = recentUserMessages.some(msg => 
      msg.body && (msg.body.includes('@') || /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(msg.body))
    );

    if (hasContactInfo) {
      suggestions.push("Customer provided contact information - update their profile");
    }
  }

  // Conversation length-based suggestions
  if (messages && messages.length > 10) {
    suggestions.push("Long conversation - consider transferring to human agent");
  }

  return suggestions;
}

export default router;

