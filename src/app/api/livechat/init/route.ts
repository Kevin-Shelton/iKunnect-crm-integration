export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate conversation ID if not provided
    const conversationId = body.conversationId || `conv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // Generate a per-conversation token for Supabase Realtime channel security
    const token = crypto.randomBytes(16).toString('hex');
    
    // Detect language from browser or use provided
    const acceptLanguage = request.headers.get('accept-language');
    const browserLang = acceptLanguage?.split(',')[0]?.split('-')[0] || 'en';
    const lang = body.lang || browserLang;
    
    return NextResponse.json({
      ok: true,
      conversation: {
        id: conversationId,
        token: token
      },
      lang: lang,
      channel: `conv:${conversationId}:${token}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[LiveChat Init Error]', error);
    return NextResponse.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

