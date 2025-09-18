import { NextRequest, NextResponse } from 'next/server';
import { debugStorage, addMessage, clearAllData } from '@/lib/simpleStorage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  if (action === 'clear') {
    clearAllData();
    return NextResponse.json({ success: true, message: 'Storage cleared' });
  }
  
  if (action === 'test') {
    // Add test data
    addMessage('test-conv-1', {
      id: 'msg-1',
      text: 'Hello, I need help with my order',
      sender: 'customer'
    });
    
    addMessage('test-conv-1', {
      id: 'msg-2', 
      text: 'Sure, I can help you with that',
      sender: 'agent'
    });
    
    addMessage('test-conv-2', {
      id: 'msg-3',
      text: 'My account is locked',
      sender: 'customer'
    });
    
    return NextResponse.json({ success: true, message: 'Test data added' });
  }
  
  // Default: show debug info
  debugStorage();
  
  return NextResponse.json({
    success: true,
    message: 'Debug info logged to console',
    actions: {
      test: '/api/chat/debug?action=test',
      clear: '/api/chat/debug?action=clear'
    }
  });
}

