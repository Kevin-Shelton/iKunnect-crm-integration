'use client';

// WebSocket service for real-time features
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      // Use WSS for production, WS for development
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;
      
      console.log('[WebSocket] Connecting to:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received:', data);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[WebSocket] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), this.reconnectDelay);
          this.reconnectDelay *= 2; // Exponential backoff
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('[WebSocket] Listener error:', error);
        }
      });
    }
  }

  public on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener);
      }
    };
  }

  public send(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      this.ws.send(message);
      console.log('[WebSocket] Sent:', { type, payload });
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }

  // Typing indicator methods
  public startTyping(conversationId: string, userType: 'agent' | 'customer', userId: string) {
    this.send('typing_start', {
      conversationId,
      userType,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  public stopTyping(conversationId: string, userType: 'agent' | 'customer', userId: string) {
    this.send('typing_stop', {
      conversationId,
      userType,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // Chat context methods
  public setActiveChat(conversationId: string, agentId: string) {
    this.send('chat_active', {
      conversationId,
      agentId,
      timestamp: new Date().toISOString()
    });
  }

  // Message methods
  public sendMessage(conversationId: string, message: string, userType: 'agent' | 'customer', userId: string) {
    this.send('message_sent', {
      conversationId,
      message,
      userType,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService();
  }
  return wsService;
}

// React hook for WebSocket
export function useWebSocket() {
  const ws = getWebSocketService();

  const sendTypingStart = (conversationId: string, userType: 'agent' | 'customer' = 'agent') => {
    ws.startTyping(conversationId, userType, 'agent_1');
  };

  const sendTypingStop = (conversationId: string, userType: 'agent' | 'customer' = 'agent') => {
    ws.stopTyping(conversationId, userType, 'agent_1');
  };

  const setActiveChat = (conversationId: string) => {
    ws.setActiveChat(conversationId, 'agent_1');
  };

  return {
    ws,
    sendTypingStart,
    sendTypingStop,
    setActiveChat,
    isConnected: ws.isConnected(),
    on: ws.on.bind(ws),
    send: ws.send.bind(ws)
  };
}
