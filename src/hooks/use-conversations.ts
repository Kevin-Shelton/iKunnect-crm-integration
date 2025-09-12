'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Conversation, ConversationQueue } from '@/lib/types';

interface QueueStats {
  waiting: number;
  assigned: number;
  total: number;
}

interface UseConversationsReturn {
  conversations: ConversationQueue;
  queueStats: QueueStats;
  isLoading: boolean;
  error: string | null;
  refreshConversations: () => Promise<void>;
  claimConversation: (conversationId: string) => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationQueue>({
    waiting: [],
    assigned: [],
    all: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/conversations');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle the API response structure
      if (data.success && data.queue) {
        setConversations(data.queue);
      } else if (data.success && data.conversations) {
        // Fallback: if only conversations array is provided, create queue structure
        setConversations({
          waiting: [],
          assigned: [],
          all: data.conversations
        });
      } else {
        // Default empty structure
        setConversations({
          waiting: [],
          assigned: [],
          all: []
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      toast.error('Failed to load conversations');
      console.error('Error fetching conversations:', err);
      
      // Set empty structure on error
      setConversations({
        waiting: [],
        assigned: [],
        all: []
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh conversations
  const refreshConversations = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  // Claim a conversation
  const claimConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to claim conversation');
      }

      toast.success('Conversation claimed successfully');
      await refreshConversations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim conversation';
      toast.error(errorMessage);
      console.error('Error claiming conversation:', err);
    }
  }, [refreshConversations]);

  // Calculate queue stats
  const queueStats: QueueStats = {
    waiting: conversations.waiting.length,
    assigned: conversations.assigned.length,
    total: conversations.all.length
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchConversations]);

  return {
    conversations,
    queueStats,
    isLoading,
    error,
    refreshConversations,
    claimConversation
  };
}

