'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

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
}

export function SimpleMessages({ conversationId, className = '', onNewMessage }: SimpleMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`[SimpleMessages] Loading messages for conversation: ${conversationId}`);
        
        const response = await fetch(`/api/chat/conversations/${conversationId}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load messages');
        }
        
        console.log(`[SimpleMessages] Loaded ${data.messages.length} messages`);
        const newMessages = data.messages || [];
        setMessages(newMessages);
        
        // Trigger notification for new messages
        if (newMessages.length > messages.length && onNewMessage) {
          const latestMessage = newMessages[newMessages.length - 1];
          if (latestMessage.sender === 'customer') {
            onNewMessage(latestMessage);
          }
        }
        
      } catch (err) {
        console.error('[SimpleMessages] Error loading messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
    
    // Auto-refresh every 2 seconds
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, [conversationId, messages.length, onNewMessage]);

  if (isLoading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-500">Loading messages...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">❌ Error loading messages</div>
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
          <div className="text-gray-500">No messages yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${className}`}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
            message.sender === 'agent' ? 'flex-row-reverse space-x-reverse' : ''
          }`}>
            <Avatar className="w-8 h-8">
              <AvatarFallback className={
                message.sender === 'agent' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }>
                {message.sender === 'agent' ? 'A' : 'C'}
              </AvatarFallback>
            </Avatar>
            <div className={`rounded-lg px-3 py-2 ${
              message.sender === 'agent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              <p className="text-sm">{message.text}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'agent' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

