'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { ContactSidebar } from '@/components/layout/contact-sidebar';
import { useConversations } from '@/hooks/use-conversations';
import { Conversation, ConversationQueue } from '@/lib/types';

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  // Use conversations hook with safe defaults
  const {
    conversations = { waiting: [], assigned: [], all: [] } as ConversationQueue,
    queueStats = { waiting: 0, assigned: 0, total: 0 },
    isLoading = false,
    error = null,
    refreshConversations = () => {}
  } = useConversations() || {};

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
        <Header />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
          <Sidebar
            conversations={conversations}
            queueStats={queueStats}
            onConversationSelect={handleConversationSelect}
          />
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex">
          <div className="flex-1">
            {selectedConversationId ? (
              <ChatInterface conversationId={selectedConversationId} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Agent Chat Desk
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Your n8n to Agent Desk integration is ready! The chat system will receive conversations from your GoHighLevel workflows.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                    <div className="flex items-center mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-green-800 font-medium">Integration Active</span>
                    </div>
                    <p className="text-green-700 text-sm">
                      Ready to receive messages from n8n workflows
                    </p>
                  </div>
                  <div className="mt-6 text-sm text-gray-500">
                    <div><strong>API Endpoint:</strong> /api/chat-events</div>
                    <div><strong>HMAC Secret:</strong> your_shared_hmac_secret_here_change_this_in_production</div>
                    <div className="flex items-center justify-center mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span><strong>Status:</strong> Online</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

