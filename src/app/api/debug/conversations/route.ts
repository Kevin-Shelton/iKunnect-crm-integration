import { NextResponse } from 'next/server';
import { getAllConversationsFromStorage } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('[DEBUG] Starting conversation ID debug...');
    
    // Get conversations from storage
    const conversations = await getAllConversationsFromStorage();
    console.log('[DEBUG] Raw conversations from storage:', conversations);
    
    // Analyze conversation ID patterns
    const idAnalysis = conversations.map(conv => {
      const displayId = `Customer ${conv.id.slice(-4)}`;
      return {
        actualId: conv.id,
        displayId: displayId,
        status: conv.status,
        contactName: conv.contactName,
        lastMessage: conv.lastMessageBody,
        messageCount: conv.messageCount || 0
      };
    });
    
    // Get conversation counts by status
    const waiting = conversations.filter(c => c.status === 'waiting');
    const assigned = conversations.filter(c => c.status === 'assigned');
    const rejected = conversations.filter(c => c.status === 'rejected');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      purpose: 'Debug conversation ID matching between UI and storage',
      totalConversations: conversations.length,
      conversationsByStatus: {
        waiting: waiting.length,
        assigned: assigned.length,
        rejected: rejected.length
      },
      idMappingAnalysis: idAnalysis,
      sampleConversation: conversations.length > 0 ? {
        fullObject: conversations[0],
        whatUIShows: `Customer ${conversations[0].id.slice(-4)}`,
        whatStorageHas: conversations[0].id,
        match: conversations[0].id === `Customer ${conversations[0].id.slice(-4)}`
      } : null,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    };
    
    console.log('[DEBUG] ID Analysis:', debugInfo);
    
    return NextResponse.json(debugInfo, { status: 200 });
    
  } catch (error) {
    console.error('[DEBUG] Error in conversation debug:', error);
    return NextResponse.json({ 
      error: 'Failed to debug conversations',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
