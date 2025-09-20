import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log('[Request Suggestions] Triggering n8n suggestion generation for:', conversationId);

    // Get n8n webhook URLs from environment
    const n8nSuggestionUrl = process.env.N8N_SUGGESTION_WEBHOOK_URL;
    
    if (!n8nSuggestionUrl) {
      console.warn('[Request Suggestions] N8N_SUGGESTION_WEBHOOK_URL not configured');
      return NextResponse.json({
        success: false,
        error: 'n8n suggestion webhook not configured'
      }, { status: 500 });
    }

    // Prepare payload for n8n suggestion workflow
    const n8nPayload = {
      conversationId,
      action: 'generate_suggestions',
      timestamp: new Date().toISOString(),
      source: 'agent-assist-ui'
    };

    // Call n8n suggestion webhook
    try {
      const n8nResponse = await fetch(n8nSuggestionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'iKunnect-Agent-Assist/1.0'
        },
        body: JSON.stringify(n8nPayload)
      });

      if (!n8nResponse.ok) {
        console.error('[Request Suggestions] n8n webhook failed:', {
          status: n8nResponse.status,
          statusText: n8nResponse.statusText
        });
        
        return NextResponse.json({
          success: false,
          error: `n8n suggestion webhook failed: ${n8nResponse.status}`
        }, { status: 502 });
      }

      const result = await n8nResponse.json();
      
      return NextResponse.json({
        success: true,
        conversationId,
        message: 'Suggestion request sent to n8n',
        n8nResponse: result
      });

    } catch (fetchError) {
      console.error('[Request Suggestions] n8n webhook error:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to n8n suggestion webhook'
      }, { status: 502 });
    }

  } catch (error) {
    console.error('[Request Suggestions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to request suggestions' },
      { status: 500 }
    );
  }
}
