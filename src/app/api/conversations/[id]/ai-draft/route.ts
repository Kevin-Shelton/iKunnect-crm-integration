import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';
import crypto from 'crypto';

// Use the existing n8n webhook URL
const N8N_WEBHOOK_URL = 'https://invictusbpo.app.n8n.cloud/webhook/ghl-chat-inbound';
const SHARED_HMAC_SECRET = process.env.SHARED_HMAC_SECRET;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    
    const { context, requestType = 'draft' } = body;

    const crmClient = createCRMClient();

    // Get recent messages for context
    const messagesResult = await crmClient.getMessages(conversationId);

    if (!messagesResult.success) {
      return NextResponse.json(
        { error: 'Messages not found', details: messagesResult.error },
        { status: 404 }
      );
    }

    const messages = messagesResult.data?.messages || [];
    
    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found in conversation' },
        { status: 404 }
      );
    }

    // Get contact information for better context
    let contact = null;
    const contactId = messages[0]?.contactId;
    if (contactId) {
      const contactResult = await crmClient.getContact(contactId);
      if (contactResult.success) {
        contact = contactResult.data;
      }
    }

    // Build context for AI
    const messageHistory = messages
      .slice(-5) // Last 5 messages
      .map(msg => `${msg.direction === 'inbound' ? 'Customer' : 'Agent'}: ${msg.body || 'No content'}`)
      .join('\n');

    const contactInfo = contact ? 
      `Customer: ${contact.name || contact.firstName + ' ' + contact.lastName || 'Unknown'}` +
      (contact.email ? ` (${contact.email})` : '') +
      (contact.phone ? ` (${contact.phone})` : '') : '';

    // Prepare payload for external workflow
    const n8nPayload = {
      type: 'ai_draft',
      provider: 'custom',
      conversation: {
        id: conversationId
      },
      messageId: `ai_draft_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: `AI_DRAFT_REQUEST: ${messageHistory}`,
      channel: 'ai-assistant',
      locationId: 'DKs2AdSvw0MGWJYyXwk1',
      contact: contact || {},
      lang: 'en',
      timestamp: new Date().toISOString(),
      // Additional context for AI processing
      requestType: 'ai-draft',
      context: context || '',
      contactInfo,
      messageHistory,
      messages: messages.slice(-5).map(msg => ({
        sender: msg.direction === 'inbound' ? 'customer' : 'agent',
        text: msg.body || '',
        timestamp: msg.dateAdded || new Date().toISOString()
      }))
    };

    // Generate HMAC signature if secret is available
    let signature = '';
    if (SHARED_HMAC_SECRET) {
      const payloadString = JSON.stringify(n8nPayload);
      signature = crypto
        .createHmac('sha256', SHARED_HMAC_SECRET)
        .update(payloadString, 'utf8')
        .digest('hex');
    }

    try {
      // Call external workflow
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(signature && { 'X-Signature': `sha256=${signature}` })
        },
        body: JSON.stringify(n8nPayload)
      });

      if (n8nResponse.ok) {
        const n8nData = await n8nResponse.json();
        
        console.log('[AI Draft] n8n response received:', {
          conversationId,
          status: n8nResponse.status,
          hasData: !!n8nData,
          timestamp: new Date().toISOString()
        });

        // Extract AI draft from n8n response
        let suggestion = '';
        let confidence = 0.8;
        
        if (n8nData.suggestion) {
          suggestion = n8nData.suggestion;
        } else if (n8nData.draft) {
          suggestion = n8nData.draft;
        } else if (n8nData.response) {
          suggestion = n8nData.response;
        } else if (n8nData.text) {
          suggestion = n8nData.text;
        } else if (n8nData.payload && n8nData.payload.suggestion) {
          suggestion = n8nData.payload.suggestion;
        } else if (n8nData.ai_draft) {
          suggestion = n8nData.ai_draft;
        }

        if (n8nData.confidence) {
          confidence = n8nData.confidence;
        }

        // If we got a valid suggestion from n8n, return it
        if (suggestion && suggestion.trim()) {
          return NextResponse.json({
            success: true,
            suggestion: suggestion.trim(),
            confidence,
            reasoning: 'Generated using n8n AI workflow',
            context: {
              conversationId,
              messageCount: messages.length,
              hasContact: !!contact,
              requestType,
              source: 'n8n'
            },
            timestamp: new Date().toISOString()
          });
        }

        console.log('[AI Draft] n8n response did not contain valid suggestion, using fallback');
      } else {
        console.warn('[AI Draft] n8n webhook failed:', n8nResponse.status, await n8nResponse.text());
      }
    } catch (n8nError) {
      console.error('[AI Draft] n8n request failed:', n8nError);
    }

    // Fallback suggestions if n8n is not available or fails
    // Generate contextual suggestions based on the conversation
    const lastMessage = messages[messages.length - 1];
    const customerText = lastMessage?.body?.toLowerCase() || '';
    
    let fallbackSuggestion = '';
    
    // Context-aware fallback suggestions
    if (customerText.includes('problem') || customerText.includes('issue') || customerText.includes('trouble')) {
      const problemSuggestions = [
        "I understand you're experiencing an issue, and I'm here to help you resolve this as quickly as possible. Let me look into this for you right away.",
        "Thank you for bringing this to my attention. I can see this is causing you some trouble, and I'd like to help you get this sorted out.",
        "I apologize for any inconvenience this has caused. Let me investigate this issue and provide you with a solution."
      ];
      fallbackSuggestion = problemSuggestions[Math.floor(Math.random() * problemSuggestions.length)];
    } else if (customerText.includes('order') || customerText.includes('purchase') || customerText.includes('buy')) {
      const orderSuggestions = [
        "Thank you for your order inquiry. I'd be happy to help you with any questions about your purchase. Let me check the details for you.",
        "I can assist you with your order. Could you please provide your order number so I can look up the specific details?",
        "I'll check the status of your order right away and provide you with an update on where things stand."
      ];
      fallbackSuggestion = orderSuggestions[Math.floor(Math.random() * orderSuggestions.length)];
    } else if (customerText.includes('account') || customerText.includes('login') || customerText.includes('password')) {
      const accountSuggestions = [
        "I can help you with your account-related question. For security purposes, I'll need to verify some information with you before we proceed.",
        "I understand account issues can be frustrating. Let me help you get this resolved quickly and securely.",
        "I'm here to assist you with your account. Let me walk you through the steps to get this sorted out."
      ];
      fallbackSuggestion = accountSuggestions[Math.floor(Math.random() * accountSuggestions.length)];
    } else {
      // General fallback suggestions
      const generalSuggestions = [
        "Thank you for reaching out! I'd be happy to help you with that. Let me look into this for you right away.",
        "I understand your concern. Let me check on this and get back to you with a solution.",
        "Thanks for the information. Based on what you've shared, I can help you resolve this issue.",
        "I appreciate your patience. Let me review your account and provide you with the best options available.",
        "That's a great question! I'll be glad to walk you through the process step by step."
      ];
      fallbackSuggestion = generalSuggestions[Math.floor(Math.random() * generalSuggestions.length)];
    }

    return NextResponse.json({
      success: true,
      suggestion: fallbackSuggestion,
      confidence: 0.7,
      reasoning: 'Contextual fallback response (external workflow not available)',
      context: {
        conversationId,
        messageCount: messages.length,
        hasContact: !!contact,
        requestType,
        source: 'contextual-fallback'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error generating AI draft:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
