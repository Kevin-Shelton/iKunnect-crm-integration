import { NextRequest } from 'next/server';

// WebSocket connections store
const connections = new Map<string, WebSocket>();
const typingStates = new Map<string, Map<string, { userType: string; userId: string; timestamp: string }>>();

export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  try {
    // For development, we'll simulate WebSocket with Server-Sent Events
    // In production, you'd use a proper WebSocket server
    
    const stream = new ReadableStream({
      start(controller) {
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`[WebSocket] New connection: ${connectionId}`);
        
        // Send initial connection message
        const welcomeMessage = {
          type: 'connected',
          payload: { connectionId, timestamp: new Date().toISOString() }
        };
        
        controller.enqueue(`data: ${JSON.stringify(welcomeMessage)}\n\n`);
        
        // Store connection for broadcasting
        // Note: In a real implementation, you'd store the actual WebSocket connection
        
        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          console.log(`[WebSocket] Connection closed: ${connectionId}`);
          connections.delete(connectionId);
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('[WebSocket] Error:', error);
    return new Response('WebSocket error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, payload } = await request.json();
    
    console.log(`[WebSocket] Received message:`, { type, payload });
    
    switch (type) {
      case 'typing_start':
        handleTypingStart(payload);
        break;
      case 'typing_stop':
        handleTypingStop(payload);
        break;
      case 'chat_active':
        handleChatActive(payload);
        break;
      case 'message_sent':
        handleMessageSent(payload);
        break;
      default:
        console.log(`[WebSocket] Unknown message type: ${type}`);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[WebSocket] POST error:', error);
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function handleTypingStart(payload: any) {
  const { conversationId, userType, userId } = payload;
  
  if (!typingStates.has(conversationId)) {
    typingStates.set(conversationId, new Map());
  }
  
  const conversationTyping = typingStates.get(conversationId)!;
  conversationTyping.set(`${userType}_${userId}`, {
    userType,
    userId,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[WebSocket] Typing started: ${userType} ${userId} in ${conversationId}`);
  
  // Broadcast to other connections
  broadcastToConversation(conversationId, {
    type: 'typing_indicator',
    payload: {
      conversationId,
      userType,
      userId,
      isTyping: true,
      timestamp: new Date().toISOString()
    }
  });
}

function handleTypingStop(payload: any) {
  const { conversationId, userType, userId } = payload;
  
  const conversationTyping = typingStates.get(conversationId);
  if (conversationTyping) {
    conversationTyping.delete(`${userType}_${userId}`);
    
    if (conversationTyping.size === 0) {
      typingStates.delete(conversationId);
    }
  }
  
  console.log(`[WebSocket] Typing stopped: ${userType} ${userId} in ${conversationId}`);
  
  // Broadcast to other connections
  broadcastToConversation(conversationId, {
    type: 'typing_indicator',
    payload: {
      conversationId,
      userType,
      userId,
      isTyping: false,
      timestamp: new Date().toISOString()
    }
  });
}

function handleChatActive(payload: any) {
  const { conversationId, agentId } = payload;
  
  console.log(`[WebSocket] Chat active: ${conversationId} by ${agentId}`);
  
  // Broadcast active chat change
  broadcastToAll({
    type: 'chat_active_changed',
    payload: {
      conversationId,
      agentId,
      timestamp: new Date().toISOString()
    }
  });
}

function handleMessageSent(payload: any) {
  const { conversationId, userType, userId } = payload;
  
  // Clear typing indicators for this user
  handleTypingStop({ conversationId, userType, userId });
  
  console.log(`[WebSocket] Message sent: ${userType} ${userId} in ${conversationId}`);
  
  // Broadcast message notification
  broadcastToConversation(conversationId, {
    type: 'message_received',
    payload: {
      conversationId,
      userType,
      userId,
      timestamp: new Date().toISOString()
    }
  });
}

function broadcastToConversation(conversationId: string, message: any) {
  // In a real implementation, you'd send to all connections subscribed to this conversation
  console.log(`[WebSocket] Broadcasting to conversation ${conversationId}:`, message);
}

function broadcastToAll(message: any) {
  // In a real implementation, you'd send to all active connections
  console.log(`[WebSocket] Broadcasting to all:`, message);
}

// Cleanup old typing indicators (run periodically)
setInterval(() => {
  const now = new Date().getTime();
  const timeout = 5000; // 5 seconds
  
  for (const [conversationId, conversationTyping] of typingStates.entries()) {
    for (const [key, typing] of conversationTyping.entries()) {
      const typingTime = new Date(typing.timestamp).getTime();
      if (now - typingTime > timeout) {
        conversationTyping.delete(key);
        console.log(`[WebSocket] Cleaned up stale typing indicator: ${key} in ${conversationId}`);
      }
    }
    
    if (conversationTyping.size === 0) {
      typingStates.delete(conversationId);
    }
  }
}, 10000); // Check every 10 seconds
