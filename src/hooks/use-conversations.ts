'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  contactName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  channel: 'chat' | 'sms' | 'email' | 'whatsapp' | 'facebook';
  tags: string[];
  assignedTo?: string;
  waitTime?: number;
  slaStatus?: 'normal' | 'warning' | 'breach';
  contactId?: string;
  status?: 'open' | 'closed';
}

interface ConversationQueue {
  waiting: Conversation[];
  assigned: Conversation[];
  all: Conversation[];
}

interface QueueStats {
  waiting: number;
  assigned: number;
  total: number;
}

interface UseConversationsReturn {
  conversations: ConversationQueue;
  stats: QueueStats;
  isLoading: boolean;
  error: string | null;
  refreshConversations: () => Promise<void>;
  claimConversation: (conversationId: string, agentId: string) => Promise<boolean>;
  assignConversation: (conversationId: string, agentId: string) => Promise<boolean>;
  closeConversation: (conversationId: string) => Promise<boolean>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationQueue>({
    waiting: [],
    assigned: [],
    all: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate SLA status based on wait time
  const calculateSlaStatus = (waitTime?: number): 'normal' | 'warning' | 'breach' => {
    if (!waitTime) return 'normal';
    if (waitTime >= 10) return 'breach'; // 10+ minutes = breach
    if (waitTime >= 5) return 'warning';  // 5-9 minutes = warning
    return 'normal';
  };

  // Process conversations and categorize them
  const processConversations = useCallback((rawConversations: Conversation[]) => {
    const now = Date.now();
    
    const processedConversations = rawConversations.map(conv => {
      // Calculate wait time for unassigned conversations
      const waitTime = !conv.assignedTo 
        ? Math.floor((now - new Date(conv.lastMessageTime).getTime()) / (1000 * 60))
        : conv.waitTime;
      
      return {
        ...conv,
        waitTime,
        slaStatus: calculateSlaStatus(waitTime)
      };
    });

    // Sort by priority: SLA breach > warning > normal, then by wait time
    const sortByPriority = (a: Conversation, b: Conversation) => {
      const priorityOrder = { breach: 3, warning: 2, normal: 1 };
      const aPriority = priorityOrder[a.slaStatus || 'normal'];
      const bPriority = priorityOrder[b.slaStatus || 'normal'];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // If same priority, sort by wait time (longest first)
      return (b.waitTime || 0) - (a.waitTime || 0);
    };

    const waiting = processedConversations
      .filter(conv => !conv.assignedTo && conv.status === 'open')
      .sort(sortByPriority);

    const assigned = processedConversations
      .filter(conv => conv.assignedTo && conv.status === 'open')
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    const all = processedConversations
      .filter(conv => conv.status === 'open')
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    return { waiting, assigned, all };
  }, []);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/conversations');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }
      
      const data = await response.json();
      
      // If API returns empty or no conversations, show empty state
      const conversations = data.conversations || [];
      const processedData = processConversations(conversations);
      setConversations(processedData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      console.error('Error loading conversations:', errorMessage);
      
      // Set empty state instead of showing mock data
      setConversations({
        waiting: [],
        assigned: [],
        all: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [processConversations]);

  // Refresh conversations
  const refreshConversations = useCallback(async () => {
    await fetchConversations();
    // Only show success toast if there's no error
    if (!error) {
      toast.success('Conversations refreshed');
    }
  }, [fetchConversations, error]);

  // Claim a conversation
  const claimConversation = useCallback(async (conversationId: string, agentId: string): Promise<boolean> => {
    try {
      // For now, update local state. In production, this would be:
      // const response = await fetch(`/api/conversations/${conversationId}/claim`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ agentId })
      // });
      
      setConversations(prev => {
        const conversation = prev.waiting.find(c => c.id === conversationId);
        if (!conversation) return prev;

        const updatedConversation = { ...conversation, assignedTo: agentId };
        const newWaiting = prev.waiting.filter(c => c.id !== conversationId);
        const newAssigned = [...prev.assigned, updatedConversation];
        const newAll = prev.all.map(c => c.id === conversationId ? updatedConversation : c);

        return {
          waiting: newWaiting,
          assigned: newAssigned,
          all: newAll
        };
      });

      toast.success(`Conversation claimed successfully`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim conversation';
      toast.error(`Error claiming conversation: ${errorMessage}`);
      return false;
    }
  }, []);

  // Assign a conversation to an agent
  const assignConversation = useCallback(async (conversationId: string, agentId: string): Promise<boolean> => {
    try {
      // Similar to claim, but for reassigning existing conversations
      setConversations(prev => {
        const newAll = prev.all.map(c => 
          c.id === conversationId ? { ...c, assignedTo: agentId } : c
        );
        
        return processConversations(newAll);
      });

      toast.success(`Conversation assigned to ${agentId}`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign conversation';
      toast.error(`Error assigning conversation: ${errorMessage}`);
      return false;
    }
  }, [processConversations]);

  // Close a conversation
  const closeConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      // For now, remove from local state. In production, this would be:
      // const response = await fetch(`/api/conversations/${conversationId}/close`, {
      //   method: 'POST'
      // });
      
      setConversations(prev => ({
        waiting: prev.waiting.filter(c => c.id !== conversationId),
        assigned: prev.assigned.filter(c => c.id !== conversationId),
        all: prev.all.filter(c => c.id !== conversationId)
      }));

      toast.success('Conversation closed');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close conversation';
      toast.error(`Error closing conversation: ${errorMessage}`);
      return false;
    }
  }, []);

  // Calculate stats
  const stats: QueueStats = {
    waiting: conversations.waiting.length,
    assigned: conversations.assigned.length,
    total: conversations.all.length
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-refresh every 3 seconds (as per FRD)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchConversations]);

  return {
    conversations,
    stats,
    isLoading,
    error,
    refreshConversations,
    claimConversation,
    assignConversation,
    closeConversation
  };
}

