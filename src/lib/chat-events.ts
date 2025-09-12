// Chat event types
export interface ChatEvent {
  id?: string;
  conversationId: string;
  contactId: string;
  direction: 'inbound' | 'outbound';
  actor: 'customer' | 'ai' | 'agent';
  text: string;
  timestamp: string;
  correlationId: string;
}

export interface ConversationSummary {
  conversationId: string;
  contactId: string;
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
  status: 'active' | 'waiting' | 'closed';
  assignedAgent?: string;
}

// Utility functions for chat events
export class ChatEventManager {
  private static baseUrl = '/api/chat-events';

  // Fetch events for a conversation
  static async getConversationEvents(conversationId: string): Promise<ChatEvent[]> {
    try {
      const response = await fetch(`${this.baseUrl}?conversationId=${conversationId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Error fetching conversation events:', error);
      return [];
    }
  }

  // Get all active conversations (derived from events)
  static async getActiveConversations(): Promise<ConversationSummary[]> {
    try {
      // For now, we'll need to implement a separate endpoint for this
      // or derive it from the events we have
      const response = await fetch('/api/conversations');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const data = await response.json();
      return data.conversations || [];
    } catch (error) {
      console.error('Error fetching active conversations:', error);
      return [];
    }
  }

  // Poll for new events (simple polling implementation)
  static startPolling(
    conversationId: string, 
    callback: (events: ChatEvent[]) => void,
    intervalMs: number = 2000
  ): () => void {
    let lastEventCount = 0;
    
    const poll = async () => {
      try {
        const events = await this.getConversationEvents(conversationId);
        
        // Only call callback if we have new events
        if (events.length > lastEventCount) {
          lastEventCount = events.length;
          callback(events);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  // Format message for display
  static formatMessage(event: ChatEvent): {
    text: string;
    isInbound: boolean;
    actorLabel: string;
    timestamp: Date;
  } {
    return {
      text: event.text,
      isInbound: event.direction === 'inbound',
      actorLabel: event.actor === 'customer' ? 'Customer' : 
                 event.actor === 'ai' ? 'AI Assistant' : 'Agent',
      timestamp: new Date(event.timestamp)
    };
  }

  // Group events by conversation
  static groupEventsByConversation(events: ChatEvent[]): Map<string, ChatEvent[]> {
    const grouped = new Map<string, ChatEvent[]>();
    
    for (const event of events) {
      const existing = grouped.get(event.conversationId) || [];
      existing.push(event);
      grouped.set(event.conversationId, existing);
    }

    // Sort events within each conversation by timestamp
    for (const [conversationId, conversationEvents] of grouped) {
      conversationEvents.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }

    return grouped;
  }
}

