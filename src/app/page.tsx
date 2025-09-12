'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ContactSidebar } from '@/components/layout/contact-sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useConversations } from '@/hooks/use-conversations';

export default function Home() {
  const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'away' | 'offline'>('available');
  const [activeTab, setActiveTab] = useState<'waiting' | 'assigned' | 'all'>('waiting');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  
  // Use real conversations hook with safe defaults
  const { 
    conversations = { waiting: [], assigned: [], all: [] }, 
    queueStats = { waiting: 0, assigned: 0, total: 0 }, 
    isLoading = false, 
    error = null,
    refreshConversations = () => Promise.resolve()
  } = useConversations() || {};

  const handleStatusChange = (status: 'available' | 'busy' | 'away' | 'offline') => {
    setAgentStatus(status);
  };

  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
  };

  const handleCloseConversation = (conversationId: string) => {
    console.log('Close conversation:', conversationId);
    if (selectedConversation === conversationId) {
      setSelectedConversation(null);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Agent Desk...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Error Loading</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Get current conversation data safely
  const selectedConversationData = selectedConversation 
    ? [...(conversations?.waiting || []), ...(conversations?.assigned || []), ...(conversations?.all || [])]
        .find(conv => conv.id === selectedConversation)
    : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header 
        agentStatus={agentStatus}
        onStatusChange={handleStatusChange}
        onSearch={handleSearch}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onConversationSelect={handleSelectConversation}
          onRefresh={refreshConversations}
          isLoading={isLoading}
        />
        
        <div className="flex-1 flex">
          <ChatInterface
            conversationId={selectedConversation || undefined}
          />
          
          {selectedConversationData && (
            <ContactSidebar
              contact={selectedConversationData.contact || {
                id: selectedConversationData.contactId || 'unknown',
                name: selectedConversationData.contactName || 'Unknown Contact',
                email: '',
                phone: '',
                tags: []
              }}
              opportunities={[]}
              appointments={[]}
              conversationId={selectedConversation}
              onTagContact={() => {}}
              onCreateOpportunity={() => {}}
              onUpdateOpportunity={() => {}}
              onScheduleCallback={() => {}}
              onEscalate={() => {}}
              onCloseConversation={() => setSelectedConversation(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

