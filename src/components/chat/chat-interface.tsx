'use client';

import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChatTabs } from './chat-tabs';
import { MessageThread } from './message-thread';
import { AiAssistant } from './ai-assistant';

interface Message {
  id: string;
  content: string;
  sender: 'agent' | 'customer' | 'system';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface ChatTab {
  id: string;
  contactName: string;
  lastMessage: string;
  unreadCount: number;
  isActive: boolean;
  channel: 'web' | 'sms' | 'email' | 'whatsapp';
  slaStatus: 'normal' | 'warning' | 'breach';
  timestamp: string;
  messages: Message[];
}

interface ChatInterfaceProps {
  conversationId?: string;
}

export function ChatInterface({ conversationId: _conversationId }: ChatInterfaceProps) {
  // Start with empty chat tabs - will be populated from real API data
  const [chatTabs, setChatTabs] = useState<ChatTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeTab = chatTabs.find(tab => tab.id === activeTabId);

  const handleSendMessage = () => {
    if (!message.trim() || !activeTab) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message.trim(),
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setChatTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, messages: [...tab.messages, newMessage] }
        : tab
    ));

    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleCloseTab = (tabId: string) => {
    setChatTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[0].id);
      }
      return newTabs;
    });
  };

  // Show empty state if no conversations
  if (chatTabs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 text-lg mb-2">
            No active conversations
          </div>
          <div className="text-gray-400 text-sm">
            Conversations will appear here when customers start chatting
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Chat Tabs */}
      <ChatTabs 
        tabs={chatTabs}
        onTabSelect={setActiveTabId}
        onTabClose={handleCloseTab}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="border-b px-6 py-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {activeTab?.contactName.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {activeTab?.contactName || 'Customer'}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Badge variant={activeTab?.slaStatus === 'breach' ? 'destructive' : 
                                  activeTab?.slaStatus === 'warning' ? 'secondary' : 'default'}>
                      {activeTab?.slaStatus || 'normal'}
                    </Badge>
                    <span>•</span>
                    <span>{activeTab?.channel || 'web'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAiAssistant(!showAiAssistant)}
                  className={showAiAssistant ? 'bg-blue-50 text-blue-600' : ''}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  AI Assistant
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <MessageThread 
              messages={activeTab?.messages || []}
            />
          </div>

          {/* Message Input */}
          <div className="border-t bg-white p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={handleTextareaChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="min-h-[44px] max-h-[120px] resize-none pr-12"
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="h-11"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* AI Assistant Sidebar */}
        {showAiAssistant && (
          <div className="w-80 border-l bg-gray-50">
            <AiAssistant 
              conversationId={activeTabId}
              contactName={activeTab?.contactName || 'Customer'}
              conversationContext={activeTab?.lastMessage || ''}
              onUseSuggestion={(suggestion) => {
                setMessage(suggestion);
                if (textareaRef.current) {
                  textareaRef.current.focus();
                }
              }}
              onClose={() => setShowAiAssistant(false)}
              isVisible={showAiAssistant}
            />
          </div>
        )}
      </div>
    </div>
  );
}

