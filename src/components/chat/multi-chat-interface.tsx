'use client';

import React, { useState, useEffect } from 'react';
import { ChatInterface } from './chat-interface';
import { X, MessageSquare, Users, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ActiveChat {
  id: string;
  conversationId: string;
  contactName: string;
  lastActivity: string;
  unreadCount: number;
  status: 'active' | 'waiting' | 'typing';
}

interface MultiChatInterfaceProps {
  onNewMessage?: (message: any) => void;
  onChatClosed?: (conversationId: string) => void;
  maxChats?: number;
}

export function MultiChatInterface({ 
  onNewMessage, 
  onChatClosed, 
  maxChats = 4 
}: MultiChatInterfaceProps) {
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Add a new chat to the interface
  const addChat = (conversationId: string, contactName: string) => {
    if (activeChats.length >= maxChats) {
      alert(`Maximum of ${maxChats} chats allowed. Please close a chat first.`);
      return false;
    }

    const existingChat = activeChats.find(chat => chat.conversationId === conversationId);
    if (existingChat) {
      // Switch to existing chat
      setSelectedChatId(existingChat.id);
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
    setSelectedChatId(newChat.id);
    return true;
  };

  // Remove a chat from the interface
  const removeChat = (chatId: string) => {
    const chat = activeChats.find(c => c.id === chatId);
    if (chat) {
      setActiveChats(prev => prev.filter(c => c.id !== chatId));
      
      // If this was the selected chat, select another one
      if (selectedChatId === chatId) {
        const remainingChats = activeChats.filter(c => c.id !== chatId);
        setSelectedChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
      
      onChatClosed?.(chat.conversationId);
    }
  };

  // Update chat activity
  const updateChatActivity = (conversationId: string, unreadCount = 0) => {
    setActiveChats(prev => prev.map(chat => 
      chat.conversationId === conversationId 
        ? { 
            ...chat, 
            lastActivity: new Date().toISOString(),
            unreadCount: chat.id === selectedChatId ? 0 : unreadCount,
            status: 'active' as const
          }
        : chat
    ));
  };

  // Handle new messages
  const handleNewMessage = (message: any) => {
    updateChatActivity(message.conversationId, 1);
    onNewMessage?.(message);
  };

  // Get the currently selected chat
  const selectedChat = activeChats.find(chat => chat.id === selectedChatId);

  // Expose addChat function globally for other components to use
  useEffect(() => {
    (window as any).multiChatInterface = {
      addChat,
      removeChat,
      activeChats: activeChats.length,
      maxChats
    };

    return () => {
      if ((window as any).multiChatInterface) {
        delete (window as any).multiChatInterface;
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
              <span className="text-blue-800 font-medium">Multi-Chat Ready</span>
            </div>
            <p className="text-blue-700 text-sm">
              Efficiently manage multiple customer conversations with tabbed interface
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Tabs Header */}
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
        
        <Tabs value={selectedChatId || ''} onValueChange={setSelectedChatId} className="mt-2">
          <TabsList className="grid w-full grid-cols-4 gap-1">
            {activeChats.map((chat) => (
              <TabsTrigger
                key={chat.id}
                value={chat.id}
                className="relative flex items-center justify-between px-3 py-2 text-xs"
              >
                <div className="flex items-center space-x-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${
                    chat.status === 'active' ? 'bg-green-400' :
                    chat.status === 'typing' ? 'bg-blue-400' :
                    'bg-yellow-400'
                  }`} />
                  <span className="truncate max-w-16">{chat.contactName}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  {chat.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 min-w-4 h-4">
                      {chat.unreadCount}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-red-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChat(chat.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden">
        {selectedChat ? (
          <ChatInterface
            conversationId={selectedChat.conversationId}
            onNewMessage={(message) => {
              handleNewMessage(message);
              updateChatActivity(selectedChat.conversationId);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Select a chat tab to continue the conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Active: {activeChats.filter(c => c.status === 'active').length}</span>
            <span>Unread: {activeChats.reduce((sum, chat) => sum + chat.unreadCount, 0)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Last activity: {selectedChat ? new Date(selectedChat.lastActivity).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using multi-chat functionality
export function useMultiChat() {
  const addChat = (conversationId: string, contactName: string) => {
    if ((window as any).multiChatInterface) {
      return (window as any).multiChatInterface.addChat(conversationId, contactName);
    }
    return false;
  };

  const getActiveChatsCount = () => {
    if ((window as any).multiChatInterface) {
      return (window as any).multiChatInterface.activeChats;
    }
    return 0;
  };

  const getMaxChats = () => {
    if ((window as any).multiChatInterface) {
      return (window as any).multiChatInterface.maxChats;
    }
    return 4;
  };

  return {
    addChat,
    getActiveChatsCount,
    getMaxChats
  };
}
