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
  const [chatTabs, setChatTabs] = useState<ChatTab[]>([
    {
      id: '1',
      contactName: 'Mike Davis',
      lastMessage: 'Thank you for the help!',
      unreadCount: 0,
      isActive: true,
      channel: 'web',
      slaStatus: 'normal',
      timestamp: '4 minutes ago',
      messages: [
        {
          id: '1',
          content: 'Hi, I need help with my account setup.',
          sender: 'customer',
          timestamp: '10:30 AM',
          status: 'read'
        },
        {
          id: '2',
          content: 'Hello Mike! I\'d be happy to help you with your account setup. What specific issue are you experiencing?',
          sender: 'agent',
          timestamp: '10:31 AM',
          status: 'read'
        },
        {
          id: '3',
          content: 'I can\'t seem to access the billing section.',
          sender: 'customer',
          timestamp: '10:32 AM',
          status: 'read'
        },
        {
          id: '4',
          content: 'I see the issue. Let me guide you through the steps to access your billing information.',
          sender: 'agent',
          timestamp: '10:33 AM',
          status: 'read'
        },
        {
          id: '5',
          content: 'Thank you for the help! That resolved my issue.',
          sender: 'customer',
          timestamp: '10:35 AM',
          status: 'read'
        }
      ]
    },
    {
      id: '2',
      contactName: 'Sarah Johnson',
      lastMessage: 'When will this be resolved?',
      unreadCount: 2,
      isActive: false,
      channel: 'sms',
      slaStatus: 'warning',
      timestamp: '8 minutes ago',
      messages: [
        {
          id: '1',
          content: 'My order hasn\'t arrived yet and it\'s been 5 days.',
          sender: 'customer',
          timestamp: '9:15 AM',
          status: 'read'
        },
        {
          id: '2',
          content: 'I apologize for the delay. Let me check your order status right away.',
          sender: 'agent',
          timestamp: '9:16 AM',
          status: 'read'
        },
        {
          id: '3',
          content: 'When will this be resolved?',
          sender: 'customer',
          timestamp: '9:45 AM',
          status: 'delivered'
        }
      ]
    }
  ]);

  const [activeTabId, setActiveTabId] = useState('1');
  const [messageInput, setMessageInput] = useState('');
  const [isAiAssistantVisible, setIsAiAssistantVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeTab = chatTabs.find(tab => tab.id === activeTabId);

  const handleTabSelect = (tabId: string) => {
    setChatTabs(tabs => 
      tabs.map(tab => ({ ...tab, isActive: tab.id === tabId }))
    );
    setActiveTabId(tabId);
    setIsAiAssistantVisible(false); // Close AI assistant when switching tabs
  };

  const handleTabClose = (tabId: string) => {
    const remainingTabs = chatTabs.filter(tab => tab.id !== tabId);
    setChatTabs(remainingTabs);
    
    if (activeTabId === tabId && remainingTabs.length > 0) {
      const newActiveTab = remainingTabs[0];
      setActiveTabId(newActiveTab.id);
      setChatTabs(tabs => 
        tabs.map(tab => ({ ...tab, isActive: tab.id === newActiveTab.id }))
      );
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeTab) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: messageInput.trim(),
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    // Add message to active tab
    setChatTabs(tabs =>
      tabs.map(tab =>
        tab.id === activeTabId
          ? { ...tab, messages: [...tab.messages, newMessage], lastMessage: messageInput.trim() }
          : tab
      )
    );

    setMessageInput('');
    setIsAiAssistantVisible(false);

    // TODO: Send message via API
    try {
      const response = await fetch(`/api/conversations/${activeTabId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageInput.trim(),
          agentId: 'current-agent'
        })
      });

      if (response.ok) {
        // Update message status to delivered
        setChatTabs(tabs =>
          tabs.map(tab =>
            tab.id === activeTabId
              ? {
                  ...tab,
                  messages: tab.messages.map(msg =>
                    msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
                  )
                }
              : tab
          )
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleToggleAiAssistant = () => {
    setIsAiAssistantVisible(!isAiAssistantVisible);
  };

  const handleUseSuggestion = (content: string) => {
    setMessageInput(content);
    setIsAiAssistantVisible(false);
    textareaRef.current?.focus();
  };

  const handleCloseAiAssistant = () => {
    setIsAiAssistantVisible(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (chatTabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">No Active Conversations</h3>
            <p className="text-sm text-gray-500">
              Select a conversation from the queue to start chatting
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Tabs */}
      <ChatTabs
        tabs={chatTabs}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        maxTabs={6}
      />

      {/* Active Chat Content */}
      {activeTab && (
        <>
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{activeTab.contactName}</h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {activeTab.channel.toUpperCase()}
                  </Badge>
                  {activeTab.slaStatus !== 'normal' && (
                    <Badge 
                      variant={activeTab.slaStatus === 'warning' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      SLA {activeTab.slaStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          {/* Message Thread */}
          <MessageThread messages={activeTab.messages} />

          {/* AI Assistant */}
          <AiAssistant
            conversationId={activeTabId}
            contactName={activeTab.contactName}
            conversationContext={`
              Contact: ${activeTab.contactName}
              Channel: ${activeTab.channel}
              Recent messages: ${activeTab.messages.slice(-3).map(m => `${m.sender}: ${m.content}`).join('\n')}
            `}
            onUseSuggestion={handleUseSuggestion}
            onClose={handleCloseAiAssistant}
            isVisible={isAiAssistantVisible}
          />

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="min-h-[40px] max-h-32 resize-none"
                  rows={1}
                />
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleAiAssistant}
                  className={`text-purple-600 hover:text-purple-700 hover:bg-purple-50 ${isAiAssistantVisible ? 'bg-purple-100' : ''}`}
                  title="Toggle AI Assistant"
                >
                  <Bot className="w-4 h-4" />
                </Button>
                
                <Button variant="ghost" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <Button variant="ghost" size="sm">
                  <Smile className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

