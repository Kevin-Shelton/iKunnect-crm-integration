import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log('[Messages API] Fetching messages for conversation:', conversationId, { limit });

    // Initialize Supabase client directly (same approach as conversations API)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;
    
    console.log('[Messages API] Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      conversationId
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('[Messages API] Missing Supabase configuration, returning empty messages');
      return NextResponse.json({
        success: true,
        messages: [],
        contact: {
          id: conversationId,
          name: `Customer ${conversationId.slice(-4)}`,
          email: '',
          phone: '',
          locationId: ''
        },
        total: 0,
        timestamp: new Date().toISOString(),
        error: 'Missing Supabase configuration'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query chat_events table directly for this specific conversation
    console.log('[Messages API] Querying chat_events for conversation:', conversationId);
    const { data: chatEvents, error } = await supabase
      .from('chat_events')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[Messages API] Supabase query error:', error);
      return NextResponse.json({
        success: false,
        messages: [],
        contact: {
          id: conversationId,
          name: `Customer ${conversationId.slice(-4)}`,
          email: '',
          phone: '',
          locationId: ''
        },
        total: 0,
        timestamp: new Date().toISOString(),
        error: `Database error: ${error.message}`
      });
    }

    console.log('[Messages API] Found chat events:', chatEvents?.length || 0);

    if (!chatEvents || chatEvents.length === 0) {
      console.log('[Messages API] No chat events found for conversation:', conversationId);
      return NextResponse.json({
        success: true,
        messages: [],
        contact: {
          id: conversationId,
          name: `Customer ${conversationId.slice(-4)}`,
          email: '',
          phone: '',
          locationId: ''
        },
        total: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Transform chat events to messages - DIRECT MAPPING
    const messages = chatEvents
      .filter((event: any) => event.type === 'inbound' || event.type === 'agent_send')
      .map((event: any) => ({
        id: event.message_id || event.id,
        text: event.text || '', // DIRECT MAPPING - THIS IS THE KEY FIX
        sender: event.type === 'inbound' ? 'customer' : 'agent',
        timestamp: event.created_at,
        type: event.type === 'inbound' ? 'inbound' : 'outbound',
        contactId: conversationId
      }));

    console.log('[Messages API] Transformed messages:', {
      messageCount: messages.length,
      conversationId,
      sampleMessages: messages.slice(0, 2).map(m => ({ id: m.id, text: m.text?.substring(0, 50), sender: m.sender }))
    });

    return NextResponse.json({
      success: true,
      messages: messages,
      contact: {
        id: conversationId,
        name: `Customer ${conversationId.slice(-4)}`,
        email: '',
        phone: '',
        locationId: ''
      },
      total: messages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Messages API] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      messages: [],
      contact: {
        id: conversationId,
        name: `Customer ${conversationId.slice(-4)}`,
        email: '',
        phone: '',
        locationId: ''
      },
      total: 0,
      timestamp: new Date().toISOString(),
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
