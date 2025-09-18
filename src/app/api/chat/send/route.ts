import { NextRequest, NextResponse } from 'next/server';
import { addMessage } from '@/lib/productionStorage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[Chat Send] Received request:', body);
    
    // Validate required fields
    if (!body.conversationId) {
      console.error('[Chat Send] Missing conversationId');
      return NextResponse.json({ 
        success: false, 
        error: 'conversationId is required' 
      }, { status: 400 });
    }
    
    if (!body.text || !body.text.trim()) {
      console.error('[Chat Send] Missing or empty text');
      return NextResponse.json({ 
        success: false, 
        error: 'text is required' 
      }, { status: 400 });
    }
    
    // Create message
    const message = await addMessage(body.conversationId, {
      id: body.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: body.text.trim(),
      sender: body.sender || 'customer'
    });
    
    console.log('[Chat Send] Message stored successfully:', {
      conversationId: body.conversationId,
      messageId: message.id,
      text: message.text
    });
    
    return NextResponse.json({
      success: true,
      message: message
    });
    
  } catch (error) {
    console.error('[Chat Send] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

