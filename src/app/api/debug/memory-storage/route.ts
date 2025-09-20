import { NextResponse } from 'next/server';
import { getAllConversations, getConversationStatus } from '@/lib/memory-storage';

export async function GET() {
  try {
    const conversations = getAllConversations();
    
    const debugInfo = {
      totalConversations: conversations.length,
      conversations: conversations.map(conv => ({
        id: conv.id,
        messageCount: conv.messageCount,
        lastMessageText: conv.lastMessage?.text?.substring(0, 50),
        lastMessageDate: conv.lastMessage?.created_at,
        status: conv.status,
        statusDetails: getConversationStatus(conv.id)
      })),
      memoryStoreKeys: typeof globalThis !== 'undefined' && globalThis.__messageStore 
        ? Array.from(globalThis.__messageStore.keys()) 
        : [],
      statusStoreKeys: typeof globalThis !== 'undefined' && globalThis.__conversationStatusStore
        ? Array.from(globalThis.__conversationStatusStore.keys())
        : []
    };

    console.log('[Debug] Memory storage contents:', debugInfo);

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('[Debug] Error inspecting memory storage:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
