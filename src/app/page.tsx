'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { MultiChatInterface } from '@/components/chat/multi-chat-interface';
import { ContactSidebar } from '@/components/layout/contact-sidebar';
import { NotificationSystem } from '@/components/chat/notification-system';
import { useConversations } from '@/hooks/use-conversations';
import { Conversation, ConversationQueue } from '@/lib/types';

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'waiting' | 'assigned' | 'all'>('waiting');

  // Use conversations hook with safe defaults
  const {
    conversations = { waiting: [], assigned: [], all: [] } as ConversationQueue,
    queueStats = { waiting: 0, assigned: 0, total: 0 },
    isLoading = false,
    error = null,
    refreshConversations = () => {}
  } = useConversations() || {};

  // Claim chat functionality
  const claimChat = async (conversationId: string) => {
    try {
      console.log('Attempting to claim conversation:', conversationId);
      
      const response = await fetch('/api/chat/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, agentId: 'agent_1' })
      });

      const data = await response.json();
      console.log('Claim response:', data);
      
      if (data.success) {
        console.log('Chat claimed successfully');
        
        // Find the conversation to get contact name
        const conversation = conversations.all?.find((conv: Conversation) => conv.id === conversationId);
        const contactName = conversation?.contactName || `Customer ${conversationId.slice(-4)}`;
        
        // Add to multi-chat interface
        if ((window as any).multiChatInterface) {
          const added = (window as any).multiChatInterface.addChat(conversationId, contactName);
          if (!added) {
            alert('Cannot add more chats. Maximum of 4 simultaneous chats allowed.');
            return;
          }
        }
        
        refreshConversations(); // Refresh the conversation list
        setSelectedConversationId(conversationId); // Auto-select the claimed conversation
        
        // Play new conversation notification
        handleNewConversation(conversation);
      } else {
        console.error('Failed to claim chat:', data.error);
        alert(`Failed to claim chat: ${data.error}`);
      }
    } catch (error) {
      console.error('Error claiming chat:', error);
      alert(`Error claiming chat: ${error}`);
    }
  };

  // Handle new message notifications
  const handleNewMessage = (message: any) => {
    if (notificationsEnabled && (window as any).notificationSystem) {
      (window as any).notificationSystem.playIncomingBeep();
      (window as any).notificationSystem.showNotification(
        'New Message',
        `${message.contact?.name || 'Customer'}: ${message.text}`,
        'incoming'
      );
    }
  };

  // Handle new conversation notifications
  const handleNewConversation = (conversation: any) => {
    if (notificationsEnabled && (window as any).notificationSystem) {
      (window as any).notificationSystem.playNewConversationAlert();
      (window as any).notificationSystem.showNotification(
        'New Conversation',
        `New chat from ${conversation.contactName || 'Customer'}`,
        'new'
      );
    }
  };

  // Handle dropped chat notifications
  const handleDroppedChat = (conversation: any) => {
    if (notificationsEnabled && (window as any).notificationSystem) {
      (window as any).notificationSystem.playDroppedBuzz();
      (window as any).notificationSystem.showNotification(
        'Chat Dropped',
        `Conversation with ${conversation.contactName || 'Customer'} was dropped`,
        'dropped'
      );
    }
  };

  // Safe conversation selection
  const selectedConversation = selectedConversationId 
    ? conversations.all?.find((conv: Conversation) => conv.id === selectedConversationId) || null
    : null;

  // Safe contact data
  const contactData = selectedConversation ? {
    id: selectedConversation.contactId || 'unknown',
    name: selectedConversation.contactName || 'Unknown Contact',
    email: '',
    phone: '',
    dateAdded: new Date().toISOString(),
    tags: selectedConversation.tags || [],
    customFields: {}
  } : null;

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    const conversation = conversations.all?.find((conv: Conversation) => conv.id === conversationId);
    if (conversation) {
      setSelectedContact(contactData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">⚠️ Error loading conversations</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={refreshConversations}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header 
          queueStats={queueStats}
          agentName="Agent"
          agentStatus="available"
        />
      </div>

      {/* Notification System */}
      <NotificationSystem 
        enabled={notificationsEnabled}
        onToggle={() => setNotificationsEnabled(!notificationsEnabled)}
      />

      {/* Main Content */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200">
          <Sidebar
            conversations={conversations}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onConversationSelect={(conversationId) => {
              console.log('Conversation selected:', conversationId);
              setSelectedConversationId(conversationId);
              // Also show in multi-chat if not already there
              const conversation = conversations.all?.find((conv: Conversation) => conv.id === conversationId);
              if (conversation && (window as any).multiChatInterface) {
                (window as any).multiChatInterface.addChat(conversationId, conversation.contactName);
              }
            }}
            onConversationClaim={claimChat}
            onRefresh={refreshConversations}
            isLoading={isLoading}
          />
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex">
          <div className="flex-1">
            <MultiChatInterface 
              onNewMessage={handleNewMessage}
              onChatClosed={(conversationId) => {
                // Handle chat closed - could update conversation status
                console.log('Chat closed:', conversationId);
              }}
              maxChats={4}
            />
          </div>

          {/* Contact Sidebar */}
          {selectedConversation && contactData && (
            <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0">
              <ContactSidebar
                contact={contactData}
                conversationId={selectedConversationId || undefined}
                opportunities={[]}
                appointments={[]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

