'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface AgentReplyProps {
  conversationId: string;
  onMessageSent?: (message: string) => void;
  onRefreshNeeded?: () => void;
}

export function AgentReply({ conversationId, onMessageSent, onRefreshNeeded }: AgentReplyProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageId: `agent_${Date.now()}`,
          text: message.trim(),
          sender: 'agent'
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('[Agent] Message sent successfully:', data.message);
        setMessage('');
        onMessageSent?.(message.trim());
        onRefreshNeeded?.(); // Trigger refresh
      } else {
        console.error('[Agent] Send failed:', data.error);
      }
    } catch (error) {
      console.error('[Agent] Send error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <div className="flex space-x-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
          className="flex-1 min-h-[60px] max-h-[120px] resize-none"
          disabled={isLoading}
        />
        <Button
          onClick={sendMessage}
          disabled={!message.trim() || isLoading}
          className="self-end"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

