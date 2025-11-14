'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface AgentReplyProps {
  conversationId: string;
  contactId?: string;
  onMessageSent?: (message: string) => void;
  onRefreshNeeded?: () => void;
  onTyping?: (isTyping: boolean) => void;
  compact?: boolean;
}

export function AgentReply({ conversationId, contactId, onMessageSent, onRefreshNeeded, onTyping, compact = false }: AgentReplyProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Handle typing indicators
  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (onTyping) {
      onTyping(value.length > 0);
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout to stop typing indicator
      if (value.length > 0) {
        const timeout = setTimeout(() => {
          onTyping(false);
        }, 1000);
        setTypingTimeout(timeout);
      }
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    const messageText = message.trim();
    
    try {
      // Step 1: Store message in local database (Supabase)
      const chatEventsResponse = await fetch('/api/chat-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          type: 'agent_send',
          channel: 'webchat',
          conversation: {
            id: conversationId
          },
          contact: {
            id: conversationId.replace('conv_', 'customer_')
          },
          timestamp: new Date().toISOString(),
          source: 'agent_interface',
          messageId: `agent_${Date.now()}`
        })
      });

      const chatEventsData = await chatEventsResponse.json();
      console.log('[Agent] Chat events response:', chatEventsData);
      
      if (!chatEventsResponse.ok || !chatEventsData.ok) {
        console.error('Failed to store message locally:', chatEventsData);
        alert('Failed to send message. Please try again.');
        return;
      }

      // Step 2: Send message to GHL (only if contactId is available)
      if (contactId) {
        const ghlResponse = await fetch('/api/agent/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            contactId,
            message: messageText,
          })
        });

        const ghlData = await ghlResponse.json();
        console.log('[Agent] GHL send response:', ghlData);
        
        if (!ghlResponse.ok || !ghlData.success) {
          console.error('Failed to send message to GHL:', ghlData);
          alert('Message saved locally but failed to send to GHL. Please try again.');
          return;
        }
        
        console.log('[Agent] Message sent successfully to GHL');
      } else {
        console.warn('[Agent] No contactId available, message only saved locally');
      }

      // Success!
      console.log('[Agent] Message sent successfully');
      setMessage(''); // Clear the input field
      onTyping?.(false); // Clear typing indicator
      onMessageSent?.(messageText);
      onRefreshNeeded?.();
      
    } catch (error) {
      console.error('[Agent] Send error:', error);
      alert('Error sending message. Please try again.');
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
    <div className={`border-t border-gray-200 ${compact ? 'p-2' : 'p-4'} bg-white`}>
      <div className={`flex ${compact ? 'space-x-1' : 'space-x-2'}`}>
        <Textarea
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={compact ? "Reply..." : "Type your reply... (Enter to send, Shift+Enter for new line)"}
          className={`flex-1 resize-none ${
            compact 
              ? 'min-h-[40px] max-h-[80px] text-sm' 
              : 'min-h-[60px] max-h-[120px]'
          }`}
          disabled={isLoading}
        />
        <Button
          onClick={sendMessage}
          disabled={!message.trim() || isLoading}
          className="self-end"
          size={compact ? "sm" : "default"}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Send className={compact ? "w-3 h-3" : "w-4 h-4"} />
          )}
        </Button>
      </div>
    </div>
  );
}

