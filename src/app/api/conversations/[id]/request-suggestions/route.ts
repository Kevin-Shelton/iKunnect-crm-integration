import { NextRequest, NextResponse } from 'next/server';
import { ghlIntegration } from '@/lib/ghl-integration';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { contactId } = await request.json();

  
  const locationId = ghlIntegration.locationId;

  try {
    const { id: conversationId } = await params;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log('[Request Suggestions] Triggering n8n suggestion generation for:', conversationId);

    // Use n8n inbound webhook (production)
    const n8nInboundUrl = 'https://invictusbpo.app.n8n.cloud/webhook/ghl-chat-inbound';

    // Prepare payload matching n8n workflow expectations
    const n8nPayload = {
      conversationId,
      channel: 'webchat', // Required to trigger suggestion path
      locationId,
      conversation: {
        id: conversationId,
        found: true
      },
      contact: {
        id: conversationId.replace('customer_chat_', 'cnt_').replace('conv_', 'cnt_'),
        name: 'Agent Assist Request',
        email: 'agent@ikunnect.com',
        phone: '+13141236547',
        created: false
      },
      message: {
        id: `msg_assist_${Date.now()}`,
        text: 'Agent requesting suggestions for this conversation. Customer needs assistance.'
      },
      messages: [
        {
          id: `msg_assist_${Date.now()}`,
          text: 'Agent requesting suggestions for this conversation. Customer needs assistance.',
          type: 'inbound',
          direction: 'inbound'
        }
      ]
    };

    console.log('[Request Suggestions] Sending payload to n8n:', JSON.stringify(n8nPayload, null, 2));

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
        
        // Don't surface 5xx errors to UI - return success and let SSE handle it
        return NextResponse.json({
          success: true,
          conversationId,
          message: 'Suggestion request sent (webhook returned error but continuing)',
          note: 'Suggestions will arrive via SSE if available'
        });
      }

      const result = await n8nResponse.text(); // Expect only an ack, not JSON
      
      return NextResponse.json({
        success: true,
        conversationId,
        message: 'Suggestion request sent to n8n successfully',
        note: 'Suggestions will arrive via Desk events/SSE'
      });

    } catch (fetchError) {
      console.error('[Request Suggestions] n8n webhook error:', {
        error: fetchError,
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        conversationId,
        url: n8nInboundUrl
      });
      
      // Don't surface network errors to UI - return success and let SSE handle it
      return NextResponse.json({
        success: true,
        conversationId,
        message: 'Suggestion request attempted (network error but continuing)',
        note: 'Suggestions will arrive via SSE if available'
      });
    }

  } catch (error) {
    console.error('[Request Suggestions] Unexpected error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Even for unexpected errors, don't fail the UI request
    return NextResponse.json({
      success: true,
      message: 'Suggestion request attempted',
      note: 'Suggestions will arrive via SSE if available'
    });
  }
}
