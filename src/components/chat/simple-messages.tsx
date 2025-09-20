'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Database, Settings } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'customer' | 'agent';
  timestamp: string;
}

interface SimpleMessagesProps {
  conversationId: string;
  className?: string;
  onNewMessage?: (message: Message) => void;
  compact?: boolean;
}

export function SimpleMessages({ conversationId, className = '', onNewMessage, compact = false }: SimpleMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');
  const [configurationIssue, setConfigurationIssue] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsInitialLoading(false);
      return;
    }

    let isMounted = true;

    const loadMessages = async (isBackground = false) => {
      try {
        if (!isBackground) {
          setIsInitialLoading(true);
        }
        setError(null);
        setConfigurationIssue(null);
        
        console.log(`[SimpleMessages] Loading messages for conversation: ${conversationId}`);
        
        const response = await fetch(`/api/conversations/${conversationId}/messages`);
        const data = await response.json();
        
        if (!isMounted) return; // Component unmounted
        
        if (!data.success) {
          // Check if it's a configuration issue
          if (data.error && data.error.includes('Missing Supabase configuration')) {
            setConfigurationIssue('Supabase database is not configured. Please set up the database connection to view messages.');
            setMessages([]);
            return;
          }
          throw new Error(data.error || 'Failed to load messages');
        }
        
        console.log(`[SimpleMessages] Loaded ${data.messages.length} messages`);
        const newMessages = (data.messages || []).map((msg: any) => ({
          ...msg,
          sender: msg.sender === 'contact' ? 'customer' : msg.sender === 'human_agent' ? 'agent' : msg.sender
        }));
        
        // Check if data actually changed (compare by content, not reference)
        const messagesChanged = JSON.stringify(newMessages) !== JSON.stringify(messages);
        const timestampChanged = data.timestamp !== lastFetchTime;
        
        if (messagesChanged || timestampChanged) {
          setMessages(newMessages);
          setLastFetchTime(data.timestamp);
          
          // Trigger notification for new messages (only for background updates)
          if (isBackground && newMessages.length > messages.length && onNewMessage) {
            const latestMessage = newMessages[newMessages.length - 1];
            if (latestMessage.sender === 'customer') {
              onNewMessage(latestMessage);
            }
          }
        }
        
      } catch (err) {
        if (!isMounted) return;
        console.error('[SimpleMessages] Error loading messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        if (!isMounted) return;
        if (!isBackground) {
          setIsInitialLoading(false);
        }
      }
    };

    // Initial load
    loadMessages(false);
    
    // Smart background polling - only updates when data changes
    const interval = setInterval(() => {
      loadMessages(true); // Background update - no loading states
    }, 3000); // Check every 3 seconds but only update UI if data changed
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [conversationId]); // Only depend on conversationId

  if (isInitialLoading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-500">Loading messages...</div>
        </div>
      </div>
    );
  }

  if (configurationIssue) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center mb-3">
              <Database className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">Database Configuration Required</h3>
            <p className="text-yellow-700 text-sm mb-4">{configurationIssue}</p>
            <div className="bg-yellow-100 border border-yellow-300 rounded p-3 text-left">
              <p className="text-xs text-yellow-800 font-medium mb-2">To fix this issue:</p>
              <ol className="text-xs text-yellow-700 space-y-1">
                <li>1. Set up Supabase database credentials</li>
                <li>2. Configure environment variables in Vercel</li>
                <li>3. Redeploy the application</li>
              </ol>
            </div>
          </div>
          <div className="text-center">
            <button 
              onClick={() => window.open('/api/debug/chat-events', '_blank')}
              className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              View Debug Info
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <div className="text-red-500 mb-2">Error loading messages</div>
          <div className="text-gray-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">💬</div>
          <div className="text-gray-500 mb-2">No messages yet</div>
          <div className="text-gray-400 text-sm">
            Messages will appear here when customers start chatting
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto ${compact ? 'p-2 space-y-2' : 'p-4 space-y-4'} ${className}`}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`flex items-start ${compact ? 'space-x-1 max-w-xs' : 'space-x-2 max-w-xs lg:max-w-md'} ${
            message.sender === 'agent' ? 'flex-row-reverse space-x-reverse' : ''
          }`}>
            <Avatar className={compact ? "w-6 h-6" : "w-8 h-8"}>
              <AvatarFallback className={
                message.sender === 'agent' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }>
                {message.sender === 'agent' ? 'A' : 'C'}
              </AvatarFallback>
            </Avatar>
            <div className={`rounded-lg ${compact ? 'px-2 py-1' : 'px-3 py-2'} ${
              message.sender === 'agent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              <p className={compact ? "text-xs" : "text-sm"}>{message.text}</p>
              {!compact && (
                <p className={`text-xs mt-1 ${
                  message.sender === 'agent' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
