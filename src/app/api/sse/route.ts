import { NextRequest } from 'next/server';

// Store active connections
const connections = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  console.log('[SSE] New client connection');

  const stream = new ReadableStream({
    start(controller) {
      connections.add(controller);
      
      // Send initial connection message
      const message = {
        type: 'connection',
        data: { status: 'connected' },
        timestamp: new Date().toISOString()
      };
      
      try {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        console.error('[SSE] Error sending initial message:', error);
      }

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (error) {
          console.error('[SSE] Heartbeat error:', error);
          clearInterval(heartbeat);
          connections.delete(controller);
        }
      }, 30000); // 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        console.log('[SSE] Client disconnected');
        clearInterval(heartbeat);
        connections.delete(controller);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
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
}

// Broadcast message to all connected clients
export function broadcastMessage(message: any) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  
  connections.forEach(controller => {
    try {
      controller.enqueue(data);
    } catch (error) {
      console.error('[SSE] Error broadcasting to client:', error);
      connections.delete(controller);
    }
  });
  
  console.log('[SSE] Broadcasted message to', connections.size, 'clients');
}
