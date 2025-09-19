import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Log environment variables for debugging
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_TOKEN,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey,
          urlLength: supabaseUrl?.length || 0,
          keyLength: supabaseServiceKey?.length || 0
        },
        timestamp: new Date().toISOString()
      });
    }

    // Try to create Supabase client and test connection
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test with a simple query
    const { data, error } = await supabase
      .from('chat_events')
      .select('count(*)', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error.message,
        supabaseConfig: {
          url: supabaseUrl.substring(0, 30) + '...',
          keyPrefix: supabaseServiceKey.substring(0, 10) + '...'
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      eventCount: data || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test Supabase error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
