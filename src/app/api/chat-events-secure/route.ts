import { NextRequest, NextResponse } from 'next/server';
import { insertChatEvent, getConfigurationStatus } from '@/lib/supabase-secure';
import { getSecureConfig } from '@/lib/secure-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Chat Events API Secure] Received webhook:', JSON.stringify(body, null, 2));

    // Get configuration status
    const configStatus = getConfigurationStatus();
    
    // Extract conversation ID from various possible fields
    const conversationId = body.conversation?.id || 
                          body.conversationId || 
                          body.contact?.id || 
                          body.contactId ||
                          `conv_${Date.now()}`;

    // Extract message text from multiple possible fields
    const messageText = body.text || 
                       body.messageText || 
                       body.body || 
                       body.message?.text ||
                       body.content ||
                       '';

    // Determine event type
    let eventType: 'inbound' | 'agent_send' | 'suggestions' | 'admin' = 'inbound';
    if (body.type === 'agent_send' || body.sender === 'agent') {
      eventType = 'agent_send';
    } else if (body.type === 'suggestions' || body.suggestions) {
      eventType = 'suggestions';
    } else if (body.type === 'admin') {
      eventType = 'admin';
    }

    // Create chat event
    const chatEvent = {
      conversation_id: conversationId,
      type: eventType,
      message_id: body.messageId || body.id || `msg_${Date.now()}`,
      text: messageText,
      items: body.suggestions || body.items || undefined,
      payload: {
        ...body,
        processed_at: new Date().toISOString(),
        source: 'webhook',
        config_status: configStatus.isProductionConfig ? 'production' : 'demo'
      }
    };

    console.log('[Chat Events API Secure] Processing chat event:', {
      conversationId,
      messageText: messageText.substring(0, 50) + '...',
      eventType,
      hasText: !!messageText,
      configStatus: configStatus.isProductionConfig ? 'production' : 'demo'
    });

    // Insert the chat event using secure configuration system
    const result = await insertChatEvent(chatEvent);

    console.log('[Chat Events API Secure] Chat event stored:', {
      id: result?.id,
      conversationId,
      success: !!result,
      dataSource: configStatus.hasSupabaseService ? 'supabase' : 'mock'
    });

    return NextResponse.json({
      success: true,
      message: 'Chat event processed successfully',
      eventId: result?.id,
      conversationId,
      dataSource: configStatus.hasSupabaseService ? 'supabase' : 'mock',
      configStatus: configStatus.isProductionConfig ? 'production' : 'demo',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Chat Events API Secure] Error processing webhook:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process chat event',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  const configStatus = getConfigurationStatus();
  
  return NextResponse.json({
    message: 'Chat Events API - Secure Configuration',
    status: 'active',
    configStatus: {
      isProduction: configStatus.isProductionConfig,
      hasSupabase: configStatus.hasSupabase,
      hasSupabaseService: configStatus.hasSupabaseService,
      dataSource: configStatus.hasSupabaseService ? 'supabase' : 'mock'
    },
    endpoints: {
      webhook: 'POST /api/chat-events-secure',
      debug: 'GET /api/debug/chat-events-secure'
    },
    timestamp: new Date().toISOString()
  });
}
