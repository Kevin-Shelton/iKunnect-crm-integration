import { NextResponse } from 'next/server';
import { getMemoryStorageForDebug } from '@/lib/unifiedStorage';

export async function GET() {
  try {
    const memoryData = getMemoryStorageForDebug();
    return NextResponse.json(memoryData);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      totalConversations: 0,
      conversationIds: [],
      conversations: []
    });
  }
}
