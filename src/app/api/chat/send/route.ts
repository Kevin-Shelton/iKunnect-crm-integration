import { NextRequest, NextResponse } from 'next/server';
import { addMessage } from '@/lib/productionStorage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Chat Send] Received request:', body);
    
    // Validate required fields
    if (!body.conversationId) {
      console.error('[Chat Send] Missing conversationId');
      return NextResponse.json({ 
        success: false, 
        error: 'conversationId is required' 
      }, { status: 400 });
    }
    
    if (!body.text || !body.text.trim()) {
      console.error('[Chat Send] Missing or empty text');
      return NextResponse.json({ 
        success: false, 
        error: 'text is required' 
      }, { status: 400 });
    }
    
    // Create message
    const message = await addMessage(body.conversationId, {
      id: body.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: body.text.trim(),
      sender: body.sender || 'customer'
    });
    
    console.log('[Chat Send] Message stored successfully:', {
      conversationId: body.conversationId,
      messageId: message.id,
      text: message.text
    });
    
    // If this is a customer message, trigger existing n8n AI suggestions workflow
    if (message.sender === 'customer') {
      const n8nWebhookUrl = process.env.N8N_INBOUND_WEBHOOK_URL;
      
      if (n8nWebhookUrl && n8nWebhookUrl !== 'your-n8n-webhook-url') {
        try {
          // Format message for existing n8n workflow (/ghl-chat-inbound)
          const n8nPayload = {
            conversation: { 
              id: body.conversationId 
            },
            message: { 
              id: message.id, 
              text: message.text 
            },
            contact: {
              name: body.contactName || `Customer ${body.conversationId.slice(-4)}`,
              email: body.contactEmail || null,
              phone: body.contactPhone || null
            },
            locationId: body.locationId || 'DKs2AdSvw0MGWJYyXwk1',
            channel: body.channel || 'webchat',
            timestamp: message.timestamp
          };
          
          // Send to n8n workflow (fire and forget)
          fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(n8nPayload)
          }).catch(error => {
            console.warn('[Chat Send] n8n webhook failed:', error.message);
          });
          
          console.log('[Chat Send] Triggered n8n suggestions for conversation:', body.conversationId);
        } catch (error) {
          console.warn('[Chat Send] Failed to trigger n8n suggestions:', error);
        }
      } else {
        console.log('[Chat Send] n8n webhook not configured, skipping AI suggestions');
      }
    }
    
    return NextResponse.json({
      success: true,
      message: message
    });
    
  } catch (error) {
    console.error('[Chat Send] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

