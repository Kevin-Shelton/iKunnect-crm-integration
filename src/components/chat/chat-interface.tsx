import React, { useState } from 'react';
import { SimpleMessages } from './simple-messages';
import { AgentReply } from './agent-reply';
import { AiAssistant } from './ai-assistant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';

interface ChatInterfaceProps {
  conversationId: string;
  onNewMessage?: (message: any) => void;
}

export function ChatInterface({ conversationId, onNewMessage }: ChatInterfaceProps) {
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">
            💬
          </div>
          <div className="text-gray-400 text-lg mb-2">
            No active conversations
          </div>
          <div className="text-gray-500 text-sm">
            Conversations will appear here when customers start chatting through the GoHighLevel widget
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">C</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                Customer Chat
              </h3>
              <p className="text-sm text-gray-500">
                Conversation ID: {conversationId}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Monitor Mode
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              className="flex items-center space-x-1"
            >
              <Bot className="w-4 h-4" />
              <span>{showAiAssistant ? 'Hide' : 'Show'} AI Assistant</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <SimpleMessages 
            conversationId={conversationId}
            className="flex-1 overflow-y-auto"
            onNewMessage={onNewMessage}
          />
          {/* Agent Reply Input */}
          <AgentReply 
            conversationId={conversationId}
            onMessageSent={(message) => {
              console.log('Agent sent message:', message);
              // Optionally refresh messages or handle real-time updates
            }}
          />
        </div>

        {/* AI Assistant sidebar */}
        {showAiAssistant && (
          <div className="w-80 border-l border-gray-200 bg-white">
            <AiAssistant
              conversationId={conversationId}
              contactName="Customer"
              conversationContext={`Conversation with Customer`}
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

