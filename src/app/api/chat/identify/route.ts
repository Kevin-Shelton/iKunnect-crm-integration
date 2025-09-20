import { NextRequest, NextResponse } from 'next/server';
import { customerIdentification } from '@/lib/customer-identification';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageText, action } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Customer Identify] Processing ${action} for conversation ${conversationId}`);

    let result;

    switch (action) {
      case 'process_new_conversation':
        // Process a new conversation to determine if identification is needed
        const messages = request.body ? JSON.parse(await request.text()).messages || [] : [];
        result = await customerIdentification.processNewConversation(conversationId, messages);
        break;

      case 'process_message':
        // Process a customer message during identification
        if (!messageText) {
          return NextResponse.json(
            { success: false, error: 'Message text is required for process_message action' },
            { status: 400 }
          );
        }
        result = await customerIdentification.processIdentificationMessage(conversationId, messageText);
        break;

      case 'handle_pii_request':
        // Handle PII-related questions with privacy-compliant responses
        if (!messageText) {
          return NextResponse.json(
            { success: false, error: 'Message text is required for handle_pii_request action' },
            { status: 400 }
          );
        }
        const piiResponse = customerIdentification.handlePIIRequest(messageText);
        result = {
          shouldRespond: !!piiResponse,
          response: piiResponse,
          isComplete: true,
          needsMoreInfo: false
        };
        break;

      case 'get_customer_info':
        // Get customer information for display
        const customerInfo = customerIdentification.getCustomerInfo(conversationId);
        return NextResponse.json({
          success: true,
          customerInfo
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    console.log(`[Customer Identify] Result:`, {
      shouldRespond: result.shouldRespond,
      isComplete: result.isComplete,
      needsMoreInfo: result.needsMoreInfo,
      hasResponse: !!result.response
    });

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('[Customer Identify] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'Customer Identification API',
    timestamp: new Date().toISOString()
  });
}
