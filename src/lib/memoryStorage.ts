// Shared memory storage for conversations
// This ensures all parts of the application use the same memory instance

export interface ConversationWithMessages {
  id: string;
  customer_name: string;
  messages: Array<{
    id: string;
    conversation_id: string;
    text: string;
    sender: string;
    timestamp: string;
  }>;
  last_activity: string;
  status: 'waiting' | 'assigned' | 'closed';
  assigned_agent?: string;
}

// Global memory storage - shared across all modules
const memoryConversations = new Map<string, ConversationWithMessages>();

export function getMemoryStorage(): Map<string, ConversationWithMessages> {
  return memoryConversations;
}

export function getConversationFromMemory(conversationId: string): ConversationWithMessages | undefined {
  return memoryConversations.get(conversationId);
}

export function setConversationInMemory(conversationId: string, conversation: ConversationWithMessages): void {
  memoryConversations.set(conversationId, conversation);
}

export function getAllConversationsFromMemory(): ConversationWithMessages[] {
  return Array.from(memoryConversations.values());
}

export function getMemoryStorageStats(): {
  totalConversations: number;
  conversationIds: string[];
  totalMessages: number;
} {
  const conversations = Array.from(memoryConversations.values());
  return {
    totalConversations: conversations.length,
    conversationIds: Array.from(memoryConversations.keys()),
    totalMessages: conversations.reduce((total, conv) => total + conv.messages.length, 0)
  };
}
