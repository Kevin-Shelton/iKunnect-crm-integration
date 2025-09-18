export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { pickTrace, nowIso } from '@/lib/trace';
import { tapPush } from '@/lib/ring';

export async function GET(request: NextRequest) {
  const traceId = pickTrace(request.headers);
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket') || 'all';
    
    if (!supabaseService) {
      console.warn('[Conversations API] Supabase not configured, returning empty data');
      tapPush({
        t: nowIso(),
        route: '/api/conversations',
        traceId,
        note: 'supabase_not_configured',
        data: { bucket }
      });
      
      return NextResponse.json({
        waiting: [],
        assigned: [],
        all: []
      });
    }

    // Get all chat events from Supabase
    const { data: chatEvents, error: chatError } = await supabaseService
      .from('chat_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (chatError) {
      console.error('[Conversations API] Database error:', chatError);
      tapPush({
        t: nowIso(),
        route: '/api/conversations',
        traceId,
        note: 'database_error',
        data: { error: chatError }
      });
      
      return NextResponse.json({
        error: 'Database query failed',
        details: chatError
      }, { status: 500 });
    }

    // Group events by conversation
    const conversationMap = new Map();
    
    chatEvents?.forEach((event: any) => {
      const convId = event.conversation_id;
      
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          id: convId,
          contactId: `contact_${convId}`,
          contactName: `Customer ${convId.slice(-4)}`,
          lastMessage: '',
          timestamp: event.created_at,
          unreadCount: 0,
          status: 'waiting',
          priority: 'normal',
          tags: [],
          messages: []
        });
      }
      
      const conversation = conversationMap.get(convId);
      
      // Add message to conversation
      conversation.messages.push({
        id: event.message_id || event.id,
        text: event.text || '',
        sender: event.type === 'inbound' ? 'contact' : 
                event.type === 'agent_send' ? 'agent' : 'system',
        timestamp: event.created_at,
        type: event.type
      });
      
      // Update last message and timestamp
      if (event.text && event.created_at >= conversation.timestamp) {
        conversation.lastMessage = event.text;
        conversation.timestamp = event.created_at;
      }
      
      // Count unread messages (inbound messages)
      if (event.type === 'inbound') {
        conversation.unreadCount++;
      }
      
      // Update status based on message types
      const hasAgentMessage = conversation.messages.some((m: any) => m.sender === 'agent');
      conversation.status = hasAgentMessage ? 'assigned' : 'waiting';
    });

    // Convert to array and sort by timestamp
    const conversationsArray = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Separate into waiting and assigned
    const waiting = conversationsArray.filter(conv => conv.status === 'waiting');
    const assigned = conversationsArray.filter(conv => conv.status === 'assigned');

    const response = {
      waiting,
      assigned,
      all: conversationsArray
    };

    // Log counts for debugging
    tapPush({
      t: nowIso(),
      route: '/api/conversations',
      traceId,
      note: `list_conversations_from_supabase`,
      data: { 
        bucket, 
        counts: { 
          waiting: waiting.length, 
          assigned: assigned.length, 
          total: conversationsArray.length 
        } 
      }
    });

    console.log('[Conversations API] Returning from Supabase:', {
      total: conversationsArray.length,
      waiting: waiting.length,
      assigned: assigned.length
    });

    return NextResponse.json(response);

  } catch (error) {
    tapPush({ 
      t: nowIso(), 
      route: '/api/conversations', 
      traceId, 
      note: 'error', 
      data: { error: String(error) } 
    });
    
    console.error('[Conversations API] Unexpected error:', error);
    return NextResponse.json({ 
      waiting: [], 
      assigned: [], 
      all: [] 
    });
  }
}

