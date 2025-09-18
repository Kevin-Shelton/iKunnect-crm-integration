import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    console.log('[Debug Messages] Testing conversation ID:', conversationId);

    if (!supabaseService) {
      return NextResponse.json({
        error: 'Supabase not configured',
        conversationId,
        timestamp: new Date().toISOString()
      });
    }

    // Get all events for this conversation
    const { data: chatEvents, error: chatError } = await supabaseService
      .from('chat_events')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (chatError) {
      return NextResponse.json({
        error: 'Database error',
        details: chatError,
        conversationId,
        timestamp: new Date().toISOString()
      });
    }

    // Also get all events to see what conversation IDs exist
    const { data: allEvents, error: allError } = await supabaseService
      .from('chat_events')
      .select('conversation_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      conversationId,
      eventsFound: chatEvents?.length || 0,
      events: chatEvents,
      allConversationIds: allEvents?.map(e => e.conversation_id) || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      conversationId: 'unknown',
      timestamp: new Date().toISOString()
    });
  }
}

