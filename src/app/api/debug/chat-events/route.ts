import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // First, just return basic info to test if the endpoint works
    const basicInfo = {
      status: 'Debug endpoint is working',
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_TOKEN,
        nodeEnv: process.env.NODE_ENV
      }
    };

    // Try to connect to Supabase
    try {
      const { createClient } = await import('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({
          ...basicInfo,
          error: 'Missing Supabase configuration',
          supabaseUrl: supabaseUrl ? 'present' : 'missing',
          serviceKey: supabaseServiceKey ? 'present' : 'missing'
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get recent chat events
      const { data: chatEvents, error } = await supabase
        .from('chat_events')
        .select('id, conversation_id, type, text, payload, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        return NextResponse.json({
          ...basicInfo,
          error: 'Database query failed',
          details: error.message
        });
      }

      return NextResponse.json({
        ...basicInfo,
        success: true,
        eventCount: chatEvents?.length || 0,
        recentEvents: chatEvents?.map(event => ({
          id: event.id,
          conversation_id: event.conversation_id,
          type: event.type,
          text: event.text || '(empty)',
          hasPayload: !!event.payload,
          created_at: event.created_at
        })) || []
      });

    } catch (supabaseError) {
      return NextResponse.json({
        ...basicInfo,
        error: 'Supabase connection failed',
        details: supabaseError instanceof Error ? supabaseError.message : 'Unknown error'
      });
    }

  } catch (error) {
    return NextResponse.json({
      error: 'Endpoint execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
