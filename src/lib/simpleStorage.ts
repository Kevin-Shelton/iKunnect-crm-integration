// Simple in-memory storage for chat messages
// Single source of truth for all chat data

interface Message {
  id: string;
  text: string;
  sender: 'customer' | 'agent';
  timestamp: string;
}

interface Conversation {
  id: string;
  customerName: string;
  messages: Message[];
  lastActivity: string;
  status: 'waiting' | 'assigned' | 'closed';
}

// Global storage
const conversations = new Map<string, Conversation>();

export function addMessage(conversationId: string, message: Omit<Message, 'timestamp'>) {
  const timestamp = new Date().toISOString();
  const fullMessage: Message = { ...message, timestamp };
  
  // Get or create conversation
  let conversation = conversations.get(conversationId);
  if (!conversation) {
    conversation = {
      id: conversationId,
      customerName: `Customer ${conversationId.slice(-4)}`,
      messages: [],
      lastActivity: timestamp,
      status: 'waiting'
    };
    conversations.set(conversationId, conversation);
  }
  
  // Add message
  conversation.messages.push(fullMessage);
  conversation.lastActivity = timestamp;
  
  console.log(`[Storage] Added message to conversation ${conversationId}:`, {
    messageId: message.id,
    text: message.text,
    totalMessages: conversation.messages.length
  });
  
  return fullMessage;
}

export function getConversations(): Conversation[] {
  const result = Array.from(conversations.values())
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  
  console.log(`[Storage] Retrieved ${result.length} conversations`);
  return result;
}

export function getConversation(id: string): Conversation | null {
  const conversation = conversations.get(id);
  console.log(`[Storage] Retrieved conversation ${id}:`, {
    found: !!conversation,
    messageCount: conversation?.messages.length || 0
  });
  return conversation || null;
}

export function clearAllData() {
  conversations.clear();
  console.log('[Storage] Cleared all data');
}

// Debug function
export function debugStorage() {
  console.log('[Storage Debug]', {
    totalConversations: conversations.size,
    conversationIds: Array.from(conversations.keys()),
    totalMessages: Array.from(conversations.values()).reduce((sum, conv) => sum + conv.messages.length, 0)
  });
}


// Update conversation status
export function updateConversationStatus(
  conversationId: string, 
  status: 'waiting' | 'assigned' | 'closed',
  agentId?: string
): Conversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  conversation.status = status;
  if (agentId) {
    (conversation as any).assignedAgent = agentId;
  }
  conversation.lastActivity = new Date().toISOString();

  conversations.set(conversationId, conversation);
  console.log(`[Storage] Updated conversation ${conversationId} status to ${status}`);
  
  return conversation;
}

// Get all data for debugging
export function getAllData() {
  return {
    conversations: Array.from(conversations.entries()),
    totalConversations: conversations.size
  };
}

