import { NextRequest, NextResponse } from 'next/server';
import { addMessage } from '@/lib/unifiedStorage';
import type { Direction, Sender } from '@/lib/types';
import { MsgTypeIndex } from '@/lib/types';

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
    
    // Create message using unified storage
    const messageData = {
      id: body.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: body.text.trim(),
      sender: (body.sender === 'agent' ? 'human_agent' : 'contact') as Sender,
      conversationId: body.conversationId,
      createdAt: new Date().toISOString(),
      direction: (body.sender === 'agent' ? 'outbound' : 'inbound') as Direction,
      category: 'chat' as const,
      raw: {
        id: body.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        body: body.text.trim(),
        direction: (body.sender === 'agent' ? 'outbound' : 'inbound') as Direction,
        conversationId: body.conversationId,
        contactId: body.conversationId,
        dateAdded: new Date().toISOString(),
        type: MsgTypeIndex.TYPE_LIVE_CHAT
      }
    };
    
    console.log('[Chat Send] Adding message to unified storage:', {
      conversationId: body.conversationId,
      messageId: messageData.id,
      sender: messageData.sender,
      text: messageData.text.substring(0, 50) + '...'
    });
    
    // Add message to unified storage
    await addMessage(body.conversationId, messageData);
    
    console.log('[Chat Send] Message stored successfully in unified storage');
    
    // If this is a customer message, trigger existing n8n AI suggestions workflow
    if (messageData.sender === 'contact') {
      const n8nWebhookUrl = process.env.N8N_INBOUND_WEBHOOK_URL;
      
      if (n8nWebhookUrl && n8nWebhookUrl !== 'your-n8n-webhook-url') {
        try {
          // Format message for existing n8n workflow (/ghl-chat-inbound)
          const n8nPayload = {
            conversation: { 
              id: body.conversationId 
            },
            message: { 
              id: messageData.id, 
              text: messageData.text 
            },
            contact: {
              name: body.contactName || `Customer ${body.conversationId.slice(-4)}`,
              email: body.contactEmail || null,
              phone: body.contactPhone || null
            },
            locationId: body.locationId || 'DKs2AdSvw0MGWJYyXwk1',
            channel: body.channel || 'webchat',
            timestamp: messageData.createdAt
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
    
    // For agent messages, we might want to send to customer via webhook or API
    if (messageData.sender === 'human_agent') {
      console.log('[Chat Send] Agent message stored, should be sent to customer via webhook/API');
      // TODO: Implement customer notification system here
    }
    
    return NextResponse.json({
      success: true,
      message: {
        id: messageData.id,
        text: messageData.text,
        sender: messageData.sender,
        timestamp: messageData.createdAt
      }
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
