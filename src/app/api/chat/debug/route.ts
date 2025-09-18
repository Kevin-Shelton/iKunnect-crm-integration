import { NextRequest, NextResponse } from 'next/server';
import { getStorageInfo, addMessage, clearAllData } from '@/lib/productionStorage';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  if (action === 'clear') {
    await clearAllData();
    return NextResponse.json({ success: true, message: 'Storage cleared' });
  }
  
  if (action === 'test') {
    // Add test data
    await addMessage('test-conv-1', {
      id: 'msg-1',
      text: 'Hello, I need help with my order',
      sender: 'customer'
    });
    
    await addMessage('test-conv-1', {
      id: 'msg-2', 
      text: 'Sure, I can help you with that',
      sender: 'agent'
    });
    
    await addMessage('test-conv-2', {
      id: 'msg-3',
      text: 'My account is locked',
      sender: 'customer'
    });
    
    return NextResponse.json({ success: true, message: 'Test data added' });
  }
  
  // Default: show debug info
  const storageInfo = getStorageInfo();
  
  return NextResponse.json({
    success: true,
    message: 'Debug info retrieved',
    storage: storageInfo,
    actions: {
      test: '/api/chat/debug?action=test',
      clear: '/api/chat/debug?action=clear'
    }
  });
}

