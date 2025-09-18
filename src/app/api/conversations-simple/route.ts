import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple, direct approach - query Supabase chat_events table directly
export async function GET() {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase configuration',
        debug: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all chat events, ordered by most recent
    const { data: chatEvents, error } = await supabase
      .from('chat_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Simple Conversations] Supabase error:', error);
      return NextResponse.json({ 
        error: 'Database query failed',
        details: error.message 
      }, { status: 500 });
    }

    if (!chatEvents || chatEvents.length === 0) {
      return NextResponse.json({
        waiting: [],
        assigned: [],
        all: [],
        debug: {
          message: 'No chat events found in database',
          totalEvents: 0
        }
      });
    }

    // Group events by conversation_id and extract the latest message text
    const conversationMap = new Map();

    chatEvents.forEach((event: any) => {
      const convId = event.conversation_id;
      
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          id: convId,
          contactId: `contact_${convId}`,
          contactName: `Customer ${convId.slice(-4)}`,
          lastMessageBody: '',
          lastMessageDate: event.created_at,
          unreadCount: 0,
          status: 'waiting',
          priority: 'normal',
          tags: [],
          messages: []
        });
      }

      const conversation = conversationMap.get(convId);

      // If this event has message text and is more recent, use it as lastMessageBody
      if (event.text && event.created_at >= conversation.lastMessageDate) {
        conversation.lastMessageBody = event.text;
        conversation.lastMessageDate = event.created_at;
      }

      // Count messages and determine status
      if (event.type === 'inbound' || event.type === 'agent_send') {
        conversation.unreadCount++;
        
        if (event.type === 'agent_send') {
          conversation.status = 'assigned';
        }
      }
    });

    // Convert to arrays
    const allConversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

    const waiting = allConversations.filter(conv => conv.status === 'waiting');
    const assigned = allConversations.filter(conv => conv.status === 'assigned');

    return NextResponse.json({
      waiting,
      assigned,
      all: allConversations,
      debug: {
        totalEvents: chatEvents.length,
        totalConversations: allConversations.length,
        sampleConversation: allConversations[0] || null
      }
    });

  } catch (error) {
    console.error('[Simple Conversations] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
