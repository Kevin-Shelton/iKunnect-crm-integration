export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';

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
    
    // Send request to n8n workflow for AI suggestions
    const n8nWebhookUrl = process.env.N8N_AI_SUGGESTIONS_WEBHOOK_URL;
    
    if (n8nWebhookUrl && n8nWebhookUrl !== 'your-n8n-webhook-url') {
      try {
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: body.conversationId,
            messages: body.messages,
            context: conversationContext,
            requestType: 'ai-suggestions'
          })
        });

        if (n8nResponse.ok) {
          const n8nData = await n8nResponse.json();
          
          // Format n8n response to match expected structure
          const suggestions = n8nData.suggestions || n8nData.items || [];
          const formattedSuggestions = suggestions.map((suggestion: any, index: number) => ({
            text: suggestion.text || suggestion.response || suggestion.suggestion || '',
            reason: suggestion.reason || suggestion.type || 'AI-generated suggestion',
            confidence: suggestion.confidence || 0.8,
            rank: index + 1
          }));

          console.log('[AI Suggestions] n8n response received:', {
            conversationId: body.conversationId,
            suggestionsCount: formattedSuggestions.length,
            timestamp: new Date().toISOString()
          });

          return NextResponse.json({
            ok: true,
            suggestions: formattedSuggestions,
            conversationId: body.conversationId,
            source: 'n8n'
          });
        } else {
          console.warn('[AI Suggestions] n8n webhook failed:', n8nResponse.status);
        }
      } catch (n8nError) {
        console.error('[AI Suggestions] n8n request failed:', n8nError);
      }
    } else {
      console.log('[AI Suggestions] n8n webhook not configured, using fallback');
    }

    // Fallback suggestions if n8n is not available or fails
    const fallbackSuggestions = [
      {
        text: "Thank you for contacting us. I'm here to help you with your inquiry.",
        reason: "Standard greeting",
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

    console.log('[AI Suggestions] Using fallback suggestions for conversation:', conversationId);

    return NextResponse.json({
      ok: true,
      suggestions: fallbackSuggestions,
      conversationId: conversationId,
      source: 'fallback'
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
    n8nConfigured: !!(process.env.N8N_AI_SUGGESTIONS_WEBHOOK_URL && 
                      process.env.N8N_AI_SUGGESTIONS_WEBHOOK_URL !== 'your-n8n-webhook-url'),
    timestamp: new Date().toISOString()
  });
}

