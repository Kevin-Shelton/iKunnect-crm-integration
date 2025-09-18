import { NextResponse } from 'next/server';
import { listConversations, getConversation } from '@/lib/chatStorage';

export async function GET() {
  try {
    const conversations = listConversations();
    const details = conversations.map(conv => ({
      ...conv,
      fullConversation: getConversation(conv.id)
    }));
    
    return NextResponse.json({
      success: true,
      totalConversations: conversations.length,
      conversations: details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

