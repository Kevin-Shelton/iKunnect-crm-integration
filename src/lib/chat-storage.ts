// Shared storage for chat events
// In a production environment, this would be replaced with a database

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
  id: string;
  contactId: string;
  contact: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    tags: string[];
  };
  status: string;
  assignedTo?: string | null;
  lastMessageBody: string;
  lastMessageTime: string;
  messageCount: number;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  source: string;
  priority: string;
  tags: string[];
  metadata: {
    hasCustomerMessages: boolean;
    hasAIMessages: boolean;
    hasAgentMessages: boolean;
    lastActor: string;
  };
}

// In-memory storage (replace with database in production)
class ChatStorage {
  private events = new Map<string, ChatEvent[]>();

  // Store a chat event
  storeEvent(event: ChatEvent): void {
    const conversationEvents = this.events.get(event.conversationId) || [];
    conversationEvents.push({
      ...event,
      timestamp: new Date().toISOString() // Use server timestamp
    });
    this.events.set(event.conversationId, conversationEvents);
    console.log(`[ChatStorage] Stored event for ${event.conversationId}. Total conversations: ${this.events.size}`);
  }

  // Get events for a specific conversation
  getConversationEvents(conversationId: string): ChatEvent[] {
    const events = this.events.get(conversationId) || [];
    console.log(`[ChatStorage] Retrieved ${events.length} events for ${conversationId}`);
    return events;
  }

  // Get all conversation IDs
  getAllConversationIds(): string[] {
    const ids = Array.from(this.events.keys());
    console.log(`[ChatStorage] All conversation IDs: ${ids.join(', ')}`);
    return ids;
  }

  // Get all events across all conversations
  getAllEvents(): Map<string, ChatEvent[]> {
    console.log(`[ChatStorage] Returning all events. Total conversations: ${this.events.size}`);
    return new Map(this.events);
  }

  // Convert chat events to conversation summary
  createConversationSummary(conversationId: string): ConversationSummary | null {
    const events = this.getConversationEvents(conversationId);
    if (!events || events.length === 0) {
      console.log(`[ChatStorage] No events found for conversation ${conversationId}`);
      return null;
    }

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const lastEvent = sortedEvents[sortedEvents.length - 1];
    const firstEvent = sortedEvents[0];

    // Determine conversation status
    const hasAgentMessages = events.some(e => e.actor === 'agent');
    const hasAIMessages = events.some(e => e.actor === 'ai');
    const hasCustomerMessages = events.some(e => e.actor === 'customer');
    
    let status = 'waiting';
    let assignedTo = null;

    if (hasAgentMessages) {
      status = 'assigned';
      assignedTo = 'agent'; // In a real system, this would be the actual agent ID
    } else if (hasAIMessages) {
      status = 'ai_handling';
    }

    // Create a conversation object that matches the expected format
    const summary = {
      id: conversationId,
      contactId: firstEvent.contactId,
      contact: {
        id: firstEvent.contactId,
        name: `Customer ${firstEvent.contactId.slice(-4)}`, // Generate a display name
        email: null,
        phone: null,
        tags: []
      },
      status,
      assignedTo,
      lastMessageBody: lastEvent.text,
      lastMessageTime: lastEvent.timestamp,
      messageCount: events.length,
      unreadCount: events.filter(e => e.actor === 'customer' && e.direction === 'inbound').length,
      createdAt: firstEvent.timestamp,
      updatedAt: lastEvent.timestamp,
      source: 'chat_events',
      priority: 'normal',
      tags: [],
      metadata: {
        hasCustomerMessages,
        hasAIMessages,
        hasAgentMessages,
        lastActor: lastEvent.actor
      }
    };

    console.log(`[ChatStorage] Created summary for ${conversationId}:`, {
      messageCount: summary.messageCount,
      lastActor: summary.metadata.lastActor,
      status: summary.status
    });

    return summary;
  }

  // Get all conversation summaries
  getAllConversationSummaries(): ConversationSummary[] {
    const summaries: ConversationSummary[] = [];
    
    console.log(`[ChatStorage] Creating summaries for ${this.events.size} conversations`);
    
    for (const conversationId of this.getAllConversationIds()) {
      const summary = this.createConversationSummary(conversationId);
      if (summary) {
        summaries.push(summary);
      }
    }

    // Sort by last message time (most recent first)
    const sortedSummaries = summaries.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    console.log(`[ChatStorage] Returning ${sortedSummaries.length} conversation summaries`);
    return sortedSummaries;
  }

  // Get conversation count
  getConversationCount(): number {
    const count = this.events.size;
    console.log(`[ChatStorage] Conversation count: ${count}`);
    return count;
  }

  // Clear all data (for testing)
  clear(): void {
    this.events.clear();
    console.log('[ChatStorage] Cleared all data');
  }

  // Debug method to log current state
  debugState(): void {
    console.log('[ChatStorage] Current state:', {
      conversationCount: this.events.size,
      conversations: Array.from(this.events.keys()),
      totalEvents: Array.from(this.events.values()).reduce((sum, events) => sum + events.length, 0)
    });
  }
}

// Use global to ensure singleton across hot reloads in development
declare global {
  var __chatStorage: ChatStorage | undefined;
}

// Singleton instance that persists across hot reloads
const chatStorage = globalThis.__chatStorage ?? new ChatStorage();

if (process.env.NODE_ENV === 'development') {
  globalThis.__chatStorage = chatStorage;
}

export default chatStorage;

