import React, { useState } from 'react';
import { ChatTabs } from './chat-tabs';
import { RealTimeMessages } from './real-time-messages';
import { AiAssistant } from './ai-assistant';
import { EmptyState } from '../layout/empty-state';
import { Conversation } from '@/lib/types';

interface ChatInterfaceProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCloseConversation: (id: string) => void;
}

export function ChatInterface({ 
  conversations, 
  selectedConversationId, 
  onSelectConversation, 
  onCloseConversation 
}: ChatInterfaceProps) {
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  // Show empty state if no conversations
  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState 
          type="no_conversations"
          title="No active conversations"
          message="Conversations will appear here when customers start chatting through the GoHighLevel widget"
        />
      </div>
    );
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat tabs */}
      <ChatTabs
        tabs={conversations.map(conv => ({
          id: conv.id,
          contactName: conv.contactName || `Customer ${conv.contactId.slice(-4)}`,
          lastMessage: conv.lastMessageBody || '',
          unreadCount: conv.unreadCount || 0,
          isActive: conv.id === selectedConversationId,
          channel: 'web' as const,
          slaStatus: 'normal' as const,
          timestamp: conv.lastMessageDate || ''
        }))}
        onTabSelect={onSelectConversation}
        onTabClose={onCloseConversation}
      />

      {/* Main chat area */}
      <div className="flex-1 flex">
        {/* Real-time message thread */}
        <div className="flex-1 flex flex-col">
          {selectedConversationId ? (
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation?.contactName || 'Customer'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Conversation ID: {selectedConversationId}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAiAssistant(!showAiAssistant)}
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                  >
                    {showAiAssistant ? 'Hide' : 'Show'} AI Assistant
                  </button>
                </div>
              </div>

              {/* Real-time messages */}
              <div className="flex-1 overflow-y-auto">
                <RealTimeMessages 
                  conversationId={selectedConversationId}
                  className="h-full"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState 
                type="no_conversations"
                title="Select a conversation"
                message="Choose a conversation from the tabs above to view real-time messages"
              />
            </div>
          )}
        </div>

        {/* AI Assistant sidebar */}
        {showAiAssistant && selectedConversationId && (
          <div className="w-80 border-l border-gray-200">
            <AiAssistant
              conversationId={selectedConversationId}
              contactName={selectedConversation?.contactName || 'Customer'}
              conversationContext={`Conversation with ${selectedConversation?.contactName || 'Customer'}`}
              onUseSuggestion={(content) => {
                // Handle AI suggestion usage
                console.log('AI suggestion:', content);
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

