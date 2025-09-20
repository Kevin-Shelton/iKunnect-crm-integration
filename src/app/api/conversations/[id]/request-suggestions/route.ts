import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log('[Request Suggestions] Triggering n8n suggestion generation for:', conversationId);

    // Use existing n8n inbound webhook (production)
    const n8nInboundUrl = 'https://invictusbpo.app.n8n.cloud/webhook/ghl-chat-inbound';

    // Prepare payload for existing n8n workflow suggestion path
    const n8nPayload = {
      conversationId,
      channel: 'webchat', // Required to trigger suggestion path
      locationId: 'DKs2AdSvw0MGWJYyXwk1', // Default location ID
      contact: {
        id: `agent_assist_${conversationId}`,
        name: 'Agent Assist Request',
        email: 'agent@ikunnect.com'
      },
      message: {
        id: `msg_assist_${Date.now()}`,
        text: 'Agent requesting suggestions for this conversation.'
      }
    };

    // Call n8n suggestion webhook
    try {
      const n8nResponse = await fetch(n8nInboundUrl, {
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
      console.error('[Request Suggestions] n8n webhook error:', {
        error: fetchError,
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        conversationId,
        url: n8nInboundUrl
      });
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to n8n suggestion webhook',
        details: fetchError instanceof Error ? fetchError.message : String(fetchError)
      }, { status: 502 });
    }

  } catch (error) {
    console.error('[Request Suggestions] Unexpected error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to request suggestions',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
