// Server-Sent Events service for real-time communication
// Works better with Vercel than WebSocket

interface SSEMessage {
  type: 'typing' | 'message' | 'status' | 'notification';
  conversationId: string;
  data: any;
  timestamp: string;
}

class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private connect() {
    try {
      console.log('[SSE] Connecting to server-sent events...');
      
      this.eventSource = new EventSource('/api/sse');
      
      this.eventSource.onopen = () => {
        console.log('[SSE] Connected successfully');
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('[SSE] Received message:', message);
          
          // Notify listeners
          const typeListeners = this.listeners.get(message.type);
          if (typeListeners) {
            typeListeners.forEach(callback => callback(message));
          }
          
          // Notify conversation-specific listeners
          const convListeners = this.listeners.get(`${message.type}:${message.conversationId}`);
          if (convListeners) {
            convListeners.forEach(callback => callback(message));
          }

          // Special handling for 'claim' event to dispatch browser event
          if (message.type === 'claim' && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('claimChat', {
              detail: message.data
            }));
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        this.handleReconnect();
      };

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.disconnect();
        this.connect();
      }, delay);
    } else {
      console.error('[SSE] Max reconnection attempts reached');
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  public isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  public subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  public subscribeToConversation(conversationId: string, eventType: string, callback: (data: any) => void): () => void {
    return this.subscribe(`${eventType}:${conversationId}`, callback);
  }

  // Send typing indicator
  public sendTyping(conversationId: string, userType: 'agent' | 'customer') {
    if (typeof window === 'undefined') return;
    
    fetch('/api/sse/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        userType,
        timestamp: new Date().toISOString()
      })
    }).catch(error => {
      console.error('[SSE] Failed to send typing indicator:', error);
    });
  }

  // Send status update
  public sendStatus(conversationId: string, status: string, data?: any) {
    if (typeof window === 'undefined') return;
    
    fetch('/api/sse/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        status,
        data,
        timestamp: new Date().toISOString()
      })
    }).catch(error => {
      console.error('[SSE] Failed to send status update:', error);
    });
  }
}

// Global instance
let sseService: SSEService | null = null;

export function getSSEService(): SSEService {
  if (!sseService && typeof window !== 'undefined') {
    sseService = new SSEService();
  }
  return sseService!;
}

export default SSEService;
