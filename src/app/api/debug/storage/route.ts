import { NextRequest, NextResponse } from 'next/server';
import { getStorageDebugInfo } from '@/lib/persistent-storage';

export async function GET(request: NextRequest) {
  try {
    console.log('[Debug Storage] Getting comprehensive storage debug info');
    
    const debugInfo = await getStorageDebugInfo();
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      storage: {
        type: 'persistent',
        location: '/tmp/chat-storage',
        ...debugInfo
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        hasSupabase: !!(process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN),
        vercelEnv: process.env.VERCEL_ENV
      },
      request: {
        url: request.url,
        method: request.method,
        headers: {
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer')
        }
      }
    };

    console.log('[Debug Storage] Response:', JSON.stringify(response, null, 2));
    
    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('[Debug Storage] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get debug info',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

