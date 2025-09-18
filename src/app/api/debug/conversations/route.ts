import { NextResponse } from 'next/server';
import { getConversations, getConversationMessages } from '@/lib/unifiedStorage';

export async function GET() {
  try {
    console.log('[Debug] Starting conversation debug...');
    
    // Get raw conversations from unified storage
    const rawConversations = await getConversations();
    console.log('[Debug] Raw conversations from unified storage:', rawConversations);
    
    // Get environment info
    const envInfo = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_TOKEN,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN,
      nodeEnv: process.env.NODE_ENV
    };
    
    // Get detailed info for first conversation if exists
    let firstConversationDetails = null;
    if (rawConversations.length > 0) {
      const firstConv = rawConversations[0];
      try {
        const { messages, contact } = await getConversationMessages(firstConv.id, 5);
        firstConversationDetails = {
          conversation: firstConv,
          messages: messages,
          contact: contact
        };
      } catch (error) {
        firstConversationDetails = {
          error: `Failed to get messages: ${error}`,
          conversation: firstConv
        };
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envInfo,
      conversationCount: rawConversations.length,
      rawConversations: rawConversations,
      firstConversationDetails: firstConversationDetails,
      debug: {
        message: 'This endpoint shows the actual data structure being returned by unified storage',
        purpose: 'To debug why production conversations show timestamps instead of message content'
      }
    });
    
  } catch (error) {
    console.error('[Debug] Error in conversation debug:', error);
    return NextResponse.json({
      error: `Debug failed: ${error}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
