import { NextRequest, NextResponse } from 'next/server';
import { customerIdentificationService } from '@/lib/customer-identification';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageText, action } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'process_new_conversation':
        // Process a new conversation to determine if identification is needed
        const messages = request.body ? JSON.parse(await request.text()).messages || [] : [];
        result = await customerIdentificationService.processNewConversation(conversationId, messages);
        break;

      case 'process_message':
        // Process a customer message during identification
        if (!messageText) {
          return NextResponse.json(
            { success: false, error: 'Message text is required for process_message action' },
            { status: 400 }
          );
        }
        result = await customerIdentificationService.processMessage(conversationId, messageText);
        break;

      case 'get_session':
        // Get identification session information
        const session = customerIdentificationService.getSession(conversationId);
        return NextResponse.json({
          success: true,
          session
        });

      case 'clear_session':
        // Clear identification session
        customerIdentificationService.clearSession(conversationId);
        return NextResponse.json({
          success: true,
          message: 'Session cleared'
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('[Identify API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
