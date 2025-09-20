'use client';

import React, { useState, useEffect } from 'react';
import { SimpleMessages } from './simple-messages';
import { AgentReply } from './agent-reply';
import { X, MessageSquare, Users, Clock, AlertCircle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ActiveChat {
  id: string;
  conversationId: string;
  contactName: string;
  lastActivity: string;
  unreadCount: number;
  status: 'active' | 'waiting' | 'typing';
  isTyping?: boolean;
}

interface VerticalMultiChatProps {
  onNewMessage?: (message: any) => void;
  onChatClosed?: (conversationId: string) => void;
  maxChats?: number;
}

export function VerticalMultiChat({ 
  onNewMessage, 
  onChatClosed, 
  maxChats = 4 
}: VerticalMultiChatProps) {
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});

  // Add a new chat to the interface
  const addChat = (conversationId: string, contactName: string) => {
    if (activeChats.length >= maxChats) {
      alert(`Maximum of ${maxChats} chats allowed. Please close a chat first.`);
      return false;
    }

    const existingChat = activeChats.find(chat => chat.conversationId === conversationId);
    if (existingChat) {
      // Chat already exists, just update activity
      updateChatActivity(conversationId);
      return true;
    }

    const newChat: ActiveChat = {
      id: `chat_${Date.now()}`,
      conversationId,
      contactName,
      lastActivity: new Date().toISOString(),
      unreadCount: 0,
      status: 'active'
    };

    setActiveChats(prev => [...prev, newChat]);
    return true;
  };

  // Remove a chat from the interface
  const removeChat = (chatId: string) => {
    const chat = activeChats.find(c => c.id === chatId);
    if (chat) {
      setActiveChats(prev => prev.filter(c => c.id !== chatId));
      onChatClosed?.(chat.conversationId);
    }
  };

  // Update chat activity and typing status
  const updateChatActivity = (conversationId: string, unreadCount = 0) => {
    setActiveChats(prev => prev.map(chat => 
      chat.conversationId === conversationId 
        ? { 
            ...chat, 
            lastActivity: new Date().toISOString(),
            unreadCount,
            status: 'active' as const
          }
        : chat
    ));
  };

  // Handle typing indicators
  const setTypingIndicator = (conversationId: string, isTyping: boolean, isAgent = false) => {
    setTypingStates(prev => ({
      ...prev,
      [`${conversationId}_${isAgent ? 'agent' : 'customer'}`]: isTyping
    }));

    // Auto-clear typing indicator after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        setTypingStates(prev => ({
          ...prev,
          [`${conversationId}_${isAgent ? 'agent' : 'customer'}`]: false
        }));
      }, 3000);
    }
  };

  // Handle new messages
  const handleNewMessage = (message: any) => {
    updateChatActivity(message.conversationId, 1);
    setTypingIndicator(message.conversationId, false, false); // Clear customer typing
    onNewMessage?.(message);
  };

  // Handle agent message sent
  const handleAgentMessageSent = (conversationId: string) => {
    updateChatActivity(conversationId);
    setTypingIndicator(conversationId, false, true); // Clear agent typing
  };

  // Expose functions globally for other components to use
  useEffect(() => {
    (window as any).verticalMultiChat = {
      addChat,
      removeChat,
      setTypingIndicator,
      activeChats: activeChats.length,
      maxChats
    };

    return () => {
      if ((window as any).verticalMultiChat) {
        delete (window as any).verticalMultiChat;
      }
    };
  }, [activeChats, maxChats]);

  if (activeChats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Multi-Chat Agent Desk
          </h2>
          <p className="text-gray-600 mb-4">
            Handle up to {maxChats} simultaneous conversations. Click "Claim Chat" on any waiting conversation to start.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center mb-2">
              <Users className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">Vertical Multi-Chat Ready</span>
            </div>
            <p className="text-blue-700 text-sm">
              View all active conversations simultaneously in vertical panels
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              Active Chats ({activeChats.length}/{maxChats})
            </span>
          </div>
          
          {activeChats.length >= maxChats && (
            <div className="flex items-center space-x-1 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">At capacity</span>
            </div>
          )}
        </div>
      </div>

      {/* Vertical Chat Panels */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4 p-4 h-full">
          {activeChats.map((chat) => {
            const isCustomerTyping = typingStates[`${chat.conversationId}_customer`];
            const isAgentTyping = typingStates[`${chat.conversationId}_agent`];
            
            return (
              <div
                key={chat.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-full min-h-[400px]"
              >
                {/* Chat Header */}
                <div className="border-b border-gray-200 p-3 bg-gray-50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        chat.status === 'active' ? 'bg-green-400' :
                        chat.status === 'typing' ? 'bg-blue-400' :
                        'bg-yellow-400'
                      }`} />
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{chat.contactName}</span>
                      {chat.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-100"
                      onClick={() => removeChat(chat.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Typing Indicators */}
                  {(isCustomerTyping || isAgentTyping) && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      {isCustomerTyping && "Customer is typing..."}
                      {isAgentTyping && "You are typing..."}
                    </div>
                  )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <SimpleMessages 
                      conversationId={chat.conversationId}
                      onNewMessage={handleNewMessage}
                      compact={true}
                    />
                  </div>
                  
                  {/* Agent Reply */}
                  <div className="border-t border-gray-200 p-2">
                    <AgentReply
                      conversationId={chat.conversationId}
                      onMessageSent={() => handleAgentMessageSent(chat.conversationId)}
                      onTyping={(isTyping) => setTypingIndicator(chat.conversationId, isTyping, true)}
                      compact={true}
                    />
                  </div>
                </div>

                {/* Chat Footer */}
                <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 rounded-b-lg">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Last: {new Date(chat.lastActivity).toLocaleTimeString()}</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Active: {activeChats.filter(c => c.status === 'active').length}</span>
            <span>Total Unread: {activeChats.reduce((sum, chat) => sum + chat.unreadCount, 0)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MessageSquare className="w-3 h-3" />
            <span>Vertical Multi-Chat Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using vertical multi-chat functionality
export function useVerticalMultiChat() {
  const addChat = (conversationId: string, contactName: string) => {
    if ((window as any).verticalMultiChat) {
      return (window as any).verticalMultiChat.addChat(conversationId, contactName);
    }
    return false;
  };

  const setTypingIndicator = (conversationId: string, isTyping: boolean, isAgent = false) => {
    if ((window as any).verticalMultiChat) {
      (window as any).verticalMultiChat.setTypingIndicator(conversationId, isTyping, isAgent);
    }
  };

  const getActiveChatsCount = () => {
    if ((window as any).verticalMultiChat) {
      return (window as any).verticalMultiChat.activeChats;
    }
    return 0;
  };

  return {
    addChat,
    setTypingIndicator,
    getActiveChatsCount
  };
}
