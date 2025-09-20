import { NextRequest, NextResponse } from 'next/server';
import { getConversation } from '@/lib/chatStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Get conversation data from storage
    const conversation = getConversation(conversationId);
    
    return NextResponse.json({
      success: true,
      conversationId,
      suggestions: conversation.suggestions || [],
      messageCount: conversation.messages.length,
      lastUpdated: conversation.updatedAt
    });

  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

// POST endpoint to add new suggestions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { suggestions } = await request.json();
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(suggestions)) {
      return NextResponse.json(
        { error: 'Suggestions must be an array' },
        { status: 400 }
      );
    }

    // Store suggestions using the existing chatStorage system
    const { addSuggestions } = await import('@/lib/chatStorage');
    addSuggestions(conversationId, suggestions);
    
    return NextResponse.json({
      success: true,
      conversationId,
      suggestionsAdded: suggestions.length
    });

  } catch (error) {
    console.error('[Suggestions API] Error adding suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to add suggestions' },
      { status: 500 }
    );
  }
}
