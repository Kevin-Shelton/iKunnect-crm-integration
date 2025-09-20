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
    rejected: [],
    all: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Safe array handling - ensure all arrays exist
      const safeData = {
        waiting: Array.isArray(data?.waiting) ? data.waiting : [],
        assigned: Array.isArray(data?.assigned) ? data.assigned : [],
        rejected: Array.isArray(data?.rejected) ? data.rejected : [],
        all: Array.isArray(data?.all) ? data.all : []
      };
      
      setConversations(safeData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      toast.error('Failed to load conversations');
      console.error('Error fetching conversations:', err);
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
      const response = await fetch(`/api/chat/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        throw new Error('Failed to claim conversation');
      }

      toast.success('Conversation claimed successfully');
      await refreshConversations();
      
      // Auto-open the claimed conversation in a chat window
      setTimeout(() => {
        const conversation = conversations.all.find(c => c.id === conversationId);
        if (conversation && (window as any).draggableMultiChat) {
          (window as any).draggableMultiChat.addChat(conversationId, conversation.contactName);
        }
      }, 500); // Small delay to ensure UI updates
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

  // Smart background refresh - only updates UI when data changes
  useEffect(() => {
    const backgroundRefresh = async () => {
      try {
        const response = await fetch('/api/chat/conversations');
        if (!response.ok) return; // Silently fail background updates
        
        const data = await response.json();
        const safeData = {
          waiting: Array.isArray(data?.waiting) ? data.waiting : [],
          assigned: Array.isArray(data?.assigned) ? data.assigned : [],
          rejected: Array.isArray(data?.rejected) ? data.rejected : [],
          all: Array.isArray(data?.all) ? data.all : []
        };
        
        // Only update if data actually changed
        const currentData = JSON.stringify(conversations);
        const newData = JSON.stringify(safeData);
        
        if (currentData !== newData) {
          setConversations(safeData);
          console.log('[useConversations] Background update: data changed, UI updated');
        }
      } catch (err) {
        // Silently handle background refresh errors
        console.log('[useConversations] Background refresh failed:', err);
      }
    };

    const interval = setInterval(backgroundRefresh, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [conversations]); // Depend on conversations to detect changes

  return {
    conversations,
    queueStats,
    isLoading,
    error,
    refreshConversations,
    claimConversation
  };
}

