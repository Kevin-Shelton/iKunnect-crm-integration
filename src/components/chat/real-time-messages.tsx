'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatEvent, ChatEventManager } from '@/lib/chat-events';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeMessagesProps {
  conversationId: string;
  className?: string;
}

export function RealTimeMessages({ conversationId, className = '' }: RealTimeMessagesProps) {
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!conversationId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Start polling for events
    const cleanup = ChatEventManager.startPolling(
      conversationId,
      (newEvents) => {
        console.log(`📨 Received ${newEvents.length} events for conversation ${conversationId}`);
        setEvents(newEvents);
        setIsLoading(false);
        
        // Scroll to bottom when new messages arrive
        setTimeout(scrollToBottom, 100);
      },
      2000 // Poll every 2 seconds
    );

    cleanupRef.current = cleanup;

    // Cleanup on unmount or conversation change
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [conversationId]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (events.length > 0) {
      scrollToBottom();
    }
  }, [events.length]);

  if (isLoading && events.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-red-600 mb-2">Error loading messages</p>
          <p className="text-xs text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">No messages yet</p>
          <p className="text-xs text-gray-400">Messages will appear here when the conversation starts</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-4 p-4 ${className}`}>
      {/* Mode indicator */}
      <div className="flex justify-center">
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Monitor Mode
        </Badge>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {events.map((event, index) => {
          const formatted = ChatEventManager.formatMessage(event);
          const isCustomer = event.actor === 'customer';
          const isAI = event.actor === 'ai';
          const isAgent = event.actor === 'agent';

          return (
            <div
              key={event.correlationId || index}
              className={`flex ${formatted.isInbound ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${
                formatted.isInbound ? 'flex-row' : 'flex-row-reverse space-x-reverse'
              }`}>
                {/* Avatar */}
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={`text-xs ${
                    isCustomer ? 'bg-blue-100 text-blue-700' :
                    isAI ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {isCustomer ? 'C' : isAI ? 'AI' : 'A'}
                  </AvatarFallback>
                </Avatar>

                {/* Message bubble */}
                <div className={`rounded-lg px-3 py-2 ${
                  formatted.isInbound 
                    ? 'bg-gray-100 text-gray-900' 
                    : isAI 
                      ? 'bg-purple-600 text-white'
                      : 'bg-blue-600 text-white'
                }`}>
                  {/* Actor label */}
                  <div className={`text-xs font-medium mb-1 ${
                    formatted.isInbound ? 'text-gray-600' : 'text-white/80'
                  }`}>
                    {formatted.actorLabel}
                  </div>

                  {/* Message text */}
                  <div className="text-sm whitespace-pre-wrap">
                    {formatted.text}
                  </div>

                  {/* Timestamp */}
                  <div className={`text-xs mt-1 ${
                    formatted.isInbound ? 'text-gray-500' : 'text-white/60'
                  }`}>
                    {formatDistanceToNow(formatted.timestamp, { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />

      {/* Live indicator */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live conversation feed</span>
        </div>
      </div>
    </div>
  );
}

