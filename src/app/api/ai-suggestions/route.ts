export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Use the existing n8n webhook URL that's already configured
const N8N_WEBHOOK_URL = 'https://invictusbpo.app.n8n.cloud/webhook/ghl-chat-inbound';
const SHARED_HMAC_SECRET = process.env.SHARED_HMAC_SECRET;

export async function POST(request: NextRequest) {
  let conversationId = 'unknown';
  
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.conversationId) {
      return NextResponse.json({
        ok: false,
        error: 'conversationId is required'
      }, { status: 400 });
    }
    
    conversationId = body.conversationId;
    
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({
        ok: false,
        error: 'messages array is required'
      }, { status: 400 });
    }
    
    // Build conversation context for n8n
    const conversationContext = body.messages
      .slice(-5) // Last 5 messages for context
      .map((msg: any) => `${msg.sender}: ${msg.text}`)
      .join('\n');
    
    // Prepare payload for the existing external workflow
    // The workflow expects a specific format for AI suggestions
    const n8nPayload = {
      type: 'ai_suggestions',
      provider: 'custom',
      conversation: {
        id: body.conversationId
      },
      messageId: `ai_req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: `AI_SUGGESTIONS_REQUEST: ${conversationContext}`,
      channel: 'ai-assistant',
      locationId: body.locationId || 'DKs2AdSvw0MGWJYyXwk1',
      contact: body.contact || {},
      lang: body.lang || 'en',
      timestamp: new Date().toISOString(),
      // Additional context for AI processing
      requestType: 'ai-suggestions',
      messages: body.messages,
      context: conversationContext
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

    // Send request to external workflow
    try {
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
        
        console.log('[AI Suggestions] n8n response received:', {
          conversationId: body.conversationId,
          status: n8nResponse.status,
          hasData: !!n8nData,
          timestamp: new Date().toISOString()
        });

        // Check if the response contains AI suggestions
        // The external workflow might return suggestions in different formats
        let suggestions = [];
        
        if (n8nData.suggestions && Array.isArray(n8nData.suggestions)) {
          suggestions = n8nData.suggestions;
        } else if (n8nData.items && Array.isArray(n8nData.items)) {
          suggestions = n8nData.items;
        } else if (n8nData.payload && n8nData.payload.suggestions) {
          suggestions = n8nData.payload.suggestions;
        } else if (n8nData.ai_suggestions) {
          suggestions = n8nData.ai_suggestions;
        }

        // Format suggestions to match expected structure
        const formattedSuggestions = suggestions.map((suggestion: any, index: number) => ({
          text: suggestion.text || suggestion.response || suggestion.suggestion || suggestion.message || '',
          reason: suggestion.reason || suggestion.type || suggestion.category || 'AI-generated suggestion',
          confidence: suggestion.confidence || suggestion.score || 0.8,
          rank: index + 1
        }));

        // If we got valid suggestions, return them
        if (formattedSuggestions.length > 0 && formattedSuggestions.some((s: any) => s.text.trim())) {
          return NextResponse.json({
            ok: true,
            suggestions: formattedSuggestions,
            conversationId: body.conversationId,
            source: 'n8n'
          });
        }

        console.log('[AI Suggestions] n8n response did not contain valid suggestions, using fallback');
      } else {
        console.warn('[AI Suggestions] n8n webhook failed:', n8nResponse.status, await n8nResponse.text());
      }
    } catch (n8nError) {
      console.error('[AI Suggestions] n8n request failed:', n8nError);
    }

    // Fallback suggestions if n8n is not available or fails
    // Generate contextual suggestions based on the conversation
    const lastMessage = body.messages[body.messages.length - 1];
    const customerText = lastMessage?.text?.toLowerCase() || '';
    
    let fallbackSuggestions = [];
    
    // Context-aware fallback suggestions
    if (customerText.includes('problem') || customerText.includes('issue') || customerText.includes('trouble')) {
      fallbackSuggestions = [
        {
          text: "I understand you're experiencing an issue. I'm here to help you resolve this as quickly as possible.",
          reason: "Empathetic problem acknowledgment",
          confidence: 0.8,
          rank: 1
        },
        {
          text: "Let me look into this for you right away. Can you provide me with some additional details about what you're experiencing?",
          reason: "Solution-focused information gathering",
          confidence: 0.9,
          rank: 2
        },
        {
          text: "I apologize for any inconvenience this has caused. Let me help you get this sorted out.",
          reason: "Professional apology and assistance offer",
          confidence: 0.85,
          rank: 3
        }
      ];
    } else if (customerText.includes('order') || customerText.includes('purchase') || customerText.includes('buy')) {
      fallbackSuggestions = [
        {
          text: "Thank you for your order inquiry. I'd be happy to help you with any questions about your purchase.",
          reason: "Order-specific greeting",
          confidence: 0.8,
          rank: 1
        },
        {
          text: "Could you please provide your order number so I can look up the specific details for you?",
          reason: "Order information request",
          confidence: 0.9,
          rank: 2
        },
        {
          text: "I'll check the status of your order and provide you with an update right away.",
          reason: "Proactive order status check",
          confidence: 0.85,
          rank: 3
        }
      ];
    } else if (customerText.includes('account') || customerText.includes('login') || customerText.includes('password')) {
      fallbackSuggestions = [
        {
          text: "I can help you with your account-related question. Let me assist you in resolving this.",
          reason: "Account support acknowledgment",
          confidence: 0.8,
          rank: 1
        },
        {
          text: "For account security, I'll need to verify some information with you before we proceed.",
          reason: "Security verification process",
          confidence: 0.9,
          rank: 2
        },
        {
          text: "I understand account issues can be frustrating. Let's get this resolved for you quickly.",
          reason: "Empathetic account assistance",
          confidence: 0.85,
          rank: 3
        }
      ];
    } else {
      // General fallback suggestions
      fallbackSuggestions = [
        {
          text: "Thank you for contacting us. I'm here to help you with your inquiry.",
          reason: "Standard professional greeting",
          confidence: 0.7,
          rank: 1
        },
        {
          text: "I understand your concern. Let me assist you in finding the best solution.",
          reason: "Empathetic response", 
          confidence: 0.7,
          rank: 2
        },
        {
          text: "Could you please provide more details so I can better assist you?",
          reason: "Information gathering",
          confidence: 0.7,
          rank: 3
        }
      ];
    }

    console.log('[AI Suggestions] Using contextual fallback suggestions for conversation:', conversationId);

    return NextResponse.json({
      ok: true,
      suggestions: fallbackSuggestions,
      conversationId: conversationId,
      source: 'contextual-fallback'
    });

  } catch (error) {
    console.error('[AI Suggestions Error]', error);
    
    // Return basic fallback suggestions on any error
    const errorFallbackSuggestions = [
      {
        text: "Thank you for reaching out. How can I assist you today?",
        reason: "Basic greeting",
        confidence: 0.6,
        rank: 1
      },
      {
        text: "I'm here to help. What can I do for you?",
        reason: "Simple offer to help",
        confidence: 0.6,
        rank: 2
      },
      {
        text: "Let me know how I can assist you with your request.",
        reason: "Open-ended assistance",
        confidence: 0.6,
        rank: 3
      }
    ];

    return NextResponse.json({
      ok: true,
      suggestions: errorFallbackSuggestions,
      conversationId: conversationId,
      source: 'error-fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/ai-suggestions',
    methods: ['POST'],
    n8nConfigured: true,
    n8nWebhookUrl: N8N_WEBHOOK_URL,
    timestamp: new Date().toISOString()
  });
}
