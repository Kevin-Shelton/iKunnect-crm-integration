import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic environment check
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_TOKEN;
    
    if (!hasSupabaseUrl || !hasServiceKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration',
        hasSupabaseUrl,
        hasServiceKey,
        timestamp: new Date().toISOString()
      });
    }

    // Try to connect to Supabase and get chat events
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_TOKEN!
    );

    const { data: chatEvents, error } = await supabase
      .from('chat_events')
      .select('id, conversation_id, type, text, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({
        error: 'Database query failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      eventCount: chatEvents?.length || 0,
      recentEvents: chatEvents?.map(event => ({
        id: event.id,
        conversation_id: event.conversation_id,
        type: event.type,
        text: event.text || '(empty)',
        textLength: event.text?.length || 0,
        hasPayload: !!event.payload,
        payloadPreview: event.payload ? JSON.stringify(event.payload).substring(0, 100) + '...' : null,
        created_at: event.created_at
      })) || []
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Endpoint execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
