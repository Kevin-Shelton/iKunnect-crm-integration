import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('[Debug Chat Events] Starting raw data inspection...');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration',
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw chat_events data to see the actual structure
    const { data: chatEvents, error } = await supabase
      .from('chat_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5); // Just get a few recent events

    if (error) {
      console.error('[Debug Chat Events] Supabase error:', error);
      return NextResponse.json({
        error: 'Database query failed',
        details: error.message
      });
    }

    // Analyze the data structure
    const analysis = {
      totalEvents: chatEvents?.length || 0,
      sampleEvent: chatEvents?.[0] || null,
      allFields: chatEvents?.[0] ? Object.keys(chatEvents[0]) : [],
      textFieldAnalysis: chatEvents?.map((event: any) => ({
        id: event.id,
        conversation_id: event.conversation_id,
        type: event.type,
        text: event.text,
        message: event.message,
        body: event.body,
        content: event.content,
        payload: typeof event.payload === 'object' ? JSON.stringify(event.payload) : event.payload,
        created_at: event.created_at
      })) || []
    };

    return NextResponse.json({
      success: true,
      analysis,
      rawEvents: chatEvents,
      debug: {
        message: 'Raw chat_events data inspection',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Debug Chat Events] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
