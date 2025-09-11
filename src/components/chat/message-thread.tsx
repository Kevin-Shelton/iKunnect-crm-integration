'use client';

import React, { useEffect, useRef } from 'react';
import { Check, CheckCheck, Clock, User, Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  content: string;
  sender: 'agent' | 'customer' | 'system';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface MessageThreadProps {
  messages: Message[];
}

export function MessageThread({ messages }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getMessageAlignment = (sender: string) => {
    return sender === 'agent' ? 'justify-end' : 'justify-start';
  };

  const getMessageBubbleStyle = (sender: string) => {
    switch (sender) {
      case 'agent':
        return 'bg-blue-600 text-white';
      case 'customer':
        return 'bg-gray-100 text-gray-900';
      case 'system':
        return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const getAvatarStyle = (sender: string) => {
    switch (sender) {
      case 'agent':
        return 'bg-blue-600 text-white';
      case 'customer':
        return 'bg-gray-500 text-white';
      case 'system':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getAvatarIcon = (sender: string) => {
    switch (sender) {
      case 'agent':
        return 'A';
      case 'customer':
        return 'C';
      case 'system':
        return <Bot className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No messages yet</p>
          <p className="text-xs text-gray-400">Start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
      {messages.map((message, index) => {
        const isConsecutive = 
          index > 0 && 
          messages[index - 1].sender === message.sender &&
          new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() < 300000; // 5 minutes

        return (
          <div key={message.id} className={`flex ${getMessageAlignment(message.sender)}`}>
            <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${message.sender === 'agent' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              {!isConsecutive && (
                <Avatar className={`w-8 h-8 ${getAvatarStyle(message.sender)}`}>
                  <AvatarFallback className={getAvatarStyle(message.sender)}>
                    {getAvatarIcon(message.sender)}
                  </AvatarFallback>
                </Avatar>
              )}
              
              {/* Spacer for consecutive messages */}
              {isConsecutive && <div className="w-8" />}

              {/* Message Bubble */}
              <div className="flex flex-col space-y-1">
                <div className={`
                  px-3 py-2 rounded-lg break-words
                  ${getMessageBubbleStyle(message.sender)}
                  ${message.sender === 'agent' 
                    ? 'rounded-br-sm' 
                    : 'rounded-bl-sm'
                  }
                  ${message.sender === 'system' ? 'text-center' : ''}
                `}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Message Info */}
                <div className={`flex items-center space-x-1 text-xs text-gray-500 ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <span>{message.timestamp}</span>
                  {message.sender === 'agent' && message.status && (
                    <div className="flex items-center">
                      {getStatusIcon(message.status)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

