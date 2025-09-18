import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '25');

    if (!supabaseService) {
      console.warn('[Messages API] Supabase not configured');
      return NextResponse.json({
        success: true,
        messages: [],
        contact: null,
        total: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Get messages for this conversation from Supabase
    const { data: chatEvents, error: chatError } = await supabaseService
      .from('chat_events')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (chatError) {
      console.error('[Messages API] Database error:', chatError);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: chatError },
        { status: 500 }
      );
    }

    // Transform chat events to message format
    const messages = chatEvents?.map((event: any) => ({
      id: event.message_id || event.id,
      text: event.text || '',
      sender: event.type === 'inbound' ? 'contact' : 
              event.type === 'agent_send' ? 'agent' : 'system',
      timestamp: event.created_at,
      type: event.type,
      contactId: event.payload?.contact?.id || null
    })) || [];

    // Extract contact info from the first message payload
    let contact = null;
    if (chatEvents && chatEvents.length > 0) {
      const firstEvent = chatEvents[0];
      const payload = firstEvent.payload || {};
      const contactData = payload.contact || {};
      
      contact = {
        id: contactData.id || conversationId,
        name: contactData.name || `Customer ${conversationId.slice(-4)}`,
        email: contactData.email || '',
        phone: contactData.phone || '',
        locationId: payload.locationId || ''
      };
    }

    console.log('[Messages API] Returning messages for conversation:', conversationId, {
      messageCount: messages.length,
      hasContact: !!contact
    });

    return NextResponse.json({
      success: true,
      messages: messages,
      contact,
      total: messages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Messages API] Error fetching messages:', error);
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

