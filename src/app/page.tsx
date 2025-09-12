'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Sidebar } from '@/components/layout/sidebar';
import { ContactSidebar } from '@/components/layout/contact-sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useConversations } from '@/hooks/use-conversations';
import { toast } from 'sonner';

export default function ChatDeskPage() {
  const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'away' | 'offline'>('available');
  const [activeTab, setActiveTab] = useState<'waiting' | 'assigned' | 'all'>('waiting');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  
  // Use real conversations hook instead of mock data
  const { 
    conversations, 
    queueStats, 
    isLoading, 
    error,
    refreshConversations 
  } = useConversations();

  const handleStatusChange = (status: 'available' | 'busy' | 'away' | 'offline') => {
    setAgentStatus(status);
    toast.success(`Status changed to ${status}`);
  };

  const handleSearch = (query: string) => {
    toast.info(`Searching for: ${query}`);
    // TODO: Implement search functionality
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };

  const handleClaimConversation = async (conversationId: string) => {
    try {
      // TODO: Implement claim conversation API call
      toast.success('Conversation claimed successfully');
      await refreshConversations();
    } catch (error) {
      toast.error('Failed to claim conversation');
    }
  };

  const handleRefresh = async () => {
    await refreshConversations();
  };

  // Get current conversation list based on active tab
  const getCurrentConversations = () => {
    switch (activeTab) {
      case 'waiting':
        return conversations.waiting;
      case 'assigned':
        return conversations.assigned;
      case 'all':
        return conversations.all;
      default:
        return conversations.all;
    }
  };

  const currentConversations = getCurrentConversations();
  const selectedConversationData = selectedConversation 
    ? currentConversations.find(c => c.id === selectedConversation)
    : null;

  return (
    <MainLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Conversation Queue */}
        <Sidebar
          conversations={conversations}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onConversationSelect={handleConversationSelect}
          onConversationClaim={handleClaimConversation}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex">
          <div className="flex-1">
            {selectedConversation ? (
              <ChatInterface 
                conversationId={selectedConversation}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="text-gray-400 text-lg mb-2">
                    Select a conversation to start chatting
                  </div>
                  <div className="text-gray-500 text-sm">
                    Choose a conversation from the queue to begin helping customers
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Contact Information */}
          {selectedConversation && (
            <ContactSidebar
              conversationId={selectedConversation}
              contact={undefined} // Will be loaded by the component
              opportunities={[]}
              appointments={[]}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}

