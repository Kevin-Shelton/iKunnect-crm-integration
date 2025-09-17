import fs from 'fs';
import path from 'path';
import { ChatEvent } from './chat-events';

const STORAGE_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(STORAGE_DIR, 'chat-events.json');

// Ensure storage directory exists
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// Storage interface for chat events
export class ChatEventStorage {
  private static events: Map<string, ChatEvent[]> = new Map();
  private static loaded = false;

  // Load events from file
  private static loadEvents() {
    if (this.loaded) return;

    ensureStorageDir();
    
    try {
      if (fs.existsSync(EVENTS_FILE)) {
        const data = fs.readFileSync(EVENTS_FILE, 'utf8');
        const eventsArray = JSON.parse(data) as ChatEvent[];
        
        // Group events by conversation ID
        this.events.clear();
        for (const event of eventsArray) {
          const conversationEvents = this.events.get(event.conversationId) || [];
          conversationEvents.push(event);
          this.events.set(event.conversationId, conversationEvents);
        }
        
        console.log(`📁 Loaded ${eventsArray.length} chat events from storage`);
      }
    } catch (error) {
      console.error('Error loading chat events from storage:', error);
      this.events.clear();
    }
    
    this.loaded = true;
  }

  // Save events to file
  private static saveEvents() {
    ensureStorageDir();
    
    try {
      // Flatten all events into a single array
      const allEvents: ChatEvent[] = [];
      for (const conversationEvents of this.events.values()) {
        allEvents.push(...conversationEvents);
      }
      
      // Sort by timestamp
      allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(allEvents, null, 2));
      console.log(`💾 Saved ${allEvents.length} chat events to storage`);
    } catch (error) {
      console.error('Error saving chat events to storage:', error);
    }
  }

  // Add a new event
  static addEvent(event: ChatEvent): void {
    this.loadEvents();
    
    const conversationEvents = this.events.get(event.conversationId) || [];
    
    // Add unique ID if not present
    if (!event.id) {
      event.id = `${event.conversationId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Add server timestamp
    event.timestamp = new Date().toISOString();
    
    conversationEvents.push(event);
    this.events.set(event.conversationId, conversationEvents);
    
    // Save to file
    this.saveEvents();
    
    console.log(`📨 Added event to conversation ${event.conversationId}. Total events: ${conversationEvents.length}`);
  }

  // Get events for a conversation
  static getConversationEvents(conversationId: string): ChatEvent[] {
    this.loadEvents();
    
    const events = this.events.get(conversationId) || [];
    
    // Sort by timestamp
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Get all conversations with their latest events
  static getAllConversations(): Array<{
    conversationId: string;
    contactId: string;
    lastMessage: string;
    lastMessageTime: string;
    messageCount: number;
    status: 'active' | 'waiting' | 'closed';
    assignedAgent?: string;
  }> {
    this.loadEvents();
    
    const conversations: Array<{
      conversationId: string;
      contactId: string;
      lastMessage: string;
      lastMessageTime: string;
      messageCount: number;
      status: 'active' | 'waiting' | 'closed';
      assignedAgent?: string;
    }> = [];
    
    for (const [conversationId, events] of this.events) {
      if (events.length === 0) continue;
      
      // Sort events by timestamp
      const sortedEvents = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      
      // Determine status based on recent activity and agent assignment
      const hasAgentMessages = events.some(e => e.actor === 'agent');
      const lastMessageTime = new Date(lastEvent.timestamp);
      const timeSinceLastMessage = Date.now() - lastMessageTime.getTime();
      const isRecent = timeSinceLastMessage < 30 * 60 * 1000; // 30 minutes
      
      let status: 'active' | 'waiting' | 'closed' = 'waiting';
      if (hasAgentMessages && isRecent) {
        status = 'active';
      } else if (!isRecent) {
        status = 'closed';
      }
      
      conversations.push({
        conversationId,
        contactId: lastEvent.contactId,
        lastMessage: lastEvent.text,
        lastMessageTime: lastEvent.timestamp,
        messageCount: events.length,
        status,
        assignedAgent: hasAgentMessages ? 'agent' : undefined
      });
    }
    
    // Sort by last message time (most recent first)
    return conversations.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }

  // Get conversation statistics
  static getStats(): {
    totalConversations: number;
    activeConversations: number;
    waitingConversations: number;
    totalEvents: number;
  } {
    this.loadEvents();
    
    const conversations = this.getAllConversations();
    const totalEvents = Array.from(this.events.values()).reduce((sum, events) => sum + events.length, 0);
    
    return {
      totalConversations: conversations.length,
      activeConversations: conversations.filter(c => c.status === 'active').length,
      waitingConversations: conversations.filter(c => c.status === 'waiting').length,
      totalEvents
    };
  }

  // Clear old events (cleanup utility)
  static clearOldEvents(olderThanDays: number = 7): number {
    this.loadEvents();
    
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;
    
    for (const [conversationId, events] of this.events) {
      const filteredEvents = events.filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        if (eventTime < cutoffTime) {
          removedCount++;
          return false;
        }
        return true;
      });
      
      if (filteredEvents.length !== events.length) {
        this.events.set(conversationId, filteredEvents);
      }
    }
    
    // Remove empty conversations
    for (const [conversationId, events] of this.events) {
      if (events.length === 0) {
        this.events.delete(conversationId);
      }
    }
    
    if (removedCount > 0) {
      this.saveEvents();
      console.log(`🧹 Cleaned up ${removedCount} old events`);
    }
    
    return removedCount;
  }
}

