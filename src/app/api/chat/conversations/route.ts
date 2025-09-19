import { NextResponse } from 'next/server';
import { getAllConversationsFromStorage } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('[Conversations] Starting conversation fetch...');
    
    // Check environment configuration
    const hasUrl = !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_TOKEN;
    
    console.log('[Conversations] Environment check:', {
      hasUrl,
      hasServiceKey,
      nodeEnv: process.env.NODE_ENV
    });

    // Get all conversations from storage (will use memory storage if Supabase not configured)
    const conversations = await getAllConversationsFromStorage();
    
    console.log('[Conversations] Retrieved conversations:', {
      count: conversations.length,
      conversations: conversations.slice(0, 3).map(c => ({
        id: c.id,
        messageCount: c.messageCount,
        lastMessageText: c.lastMessage?.text?.substring(0, 30)
      }))
    });

    // Transform to expected format for the UI
    const conversationMap = new Map();

    conversations.forEach(conv => {
      const convId = conv.id;
      
      conversationMap.set(convId, {
        id: convId,
        contactId: `contact_${convId}`,
        contactName: `Customer ${convId.slice(-4)}`,
        lastMessageBody: conv.lastMessage?.text || '', // Direct text mapping
        lastMessageDate: conv.lastMessage?.created_at || new Date().toISOString(),
        unreadCount: conv.messageCount,
        status: 'waiting', // Default to waiting, will be updated if agent messages exist
        priority: 'normal',
        tags: [],
        messages: []
      });
    });

    // Convert to arrays and sort by most recent
    const allConversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

    const waiting = allConversations.filter(conv => conv.status === 'waiting');
    const assigned = allConversations.filter(conv => conv.status === 'assigned');

    console.log('[Conversations] Returning conversations:', {
      waiting: waiting.length,
      assigned: assigned.length,
      total: allConversations.length,
      sampleLastMessageBody: allConversations[0]?.lastMessageBody || 'none'
    });

    return NextResponse.json({
      waiting,
      assigned,
      all: allConversations
    });

  } catch (error) {
    console.error('[Conversations] Unexpected error:', error);
    return NextResponse.json({
      waiting: [],
      assigned: [],
      all: [],
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
