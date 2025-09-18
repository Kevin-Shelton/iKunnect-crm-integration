import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseService) {
      return NextResponse.json({
        error: 'Supabase not configured',
        message: 'Missing environment variables'
      }, { status: 500 });
    }

    // Get all chat events
    const { data: chatEvents, error: chatError } = await supabaseService
      .from('chat_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (chatError) {
      return NextResponse.json({
        error: 'Database query failed',
        details: chatError
      }, { status: 500 });
    }

    // Group by conversation
    const conversations = chatEvents?.reduce((acc: any, event: any) => {
      const convId = event.conversation_id;
      if (!acc[convId]) {
        acc[convId] = {
          id: convId,
          messages: [],
          lastActivity: event.created_at
        };
      }
      acc[convId].messages.push(event);
      return acc;
    }, {}) || {};

    return NextResponse.json({
      success: true,
      totalEvents: chatEvents?.length || 0,
      conversations: Object.keys(conversations).length,
      recentEvents: chatEvents?.slice(0, 5),
      conversationSummary: Object.values(conversations).map((conv: any) => ({
        id: conv.id,
        messageCount: conv.messages.length,
        lastActivity: conv.lastActivity,
        types: [...new Set(conv.messages.map((m: any) => m.type))]
      }))
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

