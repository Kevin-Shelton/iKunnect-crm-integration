'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PreChatIdentityForm } from '@/components/chat/pre-chat-identity-form';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { Send, MessageCircle } from 'lucide-react';

type ChatState = 'IDENTITY_COLLECTION' | 'LOADING' | 'ACTIVE_CHAT';

export default function CustomerChatPage() {
  const [chatState, setChatState] = useState<ChatState>('IDENTITY_COLLECTION');
  const [isLoading, setIsLoading] = useState(false);
  // Generate consistent session IDs that persist during the chat session
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingConvId = sessionStorage.getItem('customer_conversation_id');
      const existingContactId = sessionStorage.getItem('customer_contact_id');
      const existingContactEmail = sessionStorage.getItem('customer_contact_email');
      const existingContactPhone = sessionStorage.getItem('customer_contact_phone');
      const existingContactName = sessionStorage.getItem('customer_contact_name');
      
      // Check if we have enough information to resume an active chat
      if (existingConvId && existingContactId && (existingContactEmail || existingContactPhone)) {
        setConversationId(existingConvId);
        setCustomerId(existingContactId);
        setCustomerName(existingContactName || '');
        // No need to set email/phone state here, as they are only needed for the Agent Desk
        setChatState('ACTIVE_CHAT');
      } else {
        // If no session data is found, ensure the state is set to IDENTITY_COLLECTION
        setChatState('IDENTITY_COLLECTION');
      }
    }
  }, []);
  
  const handleStartChat = useCallback(async (data: { fullName: string; email: string; phone: string }) => {
    setIsLoading(true);
    setChatState('LOADING');
    try {
      const response = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to start chat: ' + response.statusText);
      }

      const result = await response.json();
      
      // Store IDs and contact details in session storage for persistence
      sessionStorage.setItem('customer_conversation_id', result.conversationId);
      sessionStorage.setItem('customer_contact_id', result.contactId);
      sessionStorage.setItem('customer_contact_email', result.contactEmail || '');
      sessionStorage.setItem('customer_contact_phone', result.contactPhone || '');
      sessionStorage.setItem('customer_contact_name', result.contactName || ''); // Store contact name
      if (result.conversationProviderId) {
        sessionStorage.setItem('customer_conversation_provider_id', result.conversationProviderId);
      }
      
      setConversationId(result.conversationId);
      setCustomerId(result.contactId);
      setCustomerName(result.contactName || data.fullName);
      
      // --- NEW LOGIC: Send Initial Message to Trigger Webhook ---
      if (result.initialMessage) {
        await fetch('/api/chat-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: result.initialMessage,
            type: 'inbound',
            channel: 'webchat',
            conversation: { id: result.conversationId },
            contact: { 
              id: result.contactId,
              name: result.contactName,
              email: result.contactEmail,
              phone: result.contactPhone,
            },
            timestamp: new Date().toISOString(),
            source: 'customer_chat_start'
          })
        }).catch(err => console.error('Failed to send initial message to chat-events:', err));
      }
      // --- END NEW LOGIC ---

      setChatState('ACTIVE_CHAT');

    } catch (error) {
      console.error('Error starting chat:', error);
      setChatState('IDENTITY_COLLECTION');
      alert('Could not start chat. Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);


  
  const [messages, setMessages] = useState<any[]>([]);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  // Load initial messages and poll for updates (client-side only)
  useEffect(() => {
    if (chatState !== 'ACTIVE_CHAT' || !conversationId || typeof window === 'undefined') return; // Only run when active
    
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages && data.messages.length > 0) {
            const serverMessages = data.messages
              // Filter out "initiating chat" trigger messages
              .filter((msg: any) => msg.text.toLowerCase() !== 'initiating chat')
              .map((msg: any) => ({
                id: msg.id,
                text: msg.text || '',
                sender: msg.sender === 'customer' ? 'customer' : msg.sender,
                timestamp: msg.timestamp
              }))
              // Deduplicate messages by text content and sender
              // If the exact same text from the same sender appears multiple times, only show once
              .filter((msg: any, index: number, self: any[]) => 
                index === self.findIndex((m) => 
                  m.text === msg.text && 
                  m.sender === msg.sender && 
                  Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 5000 // Within 5 seconds
                )
              );
            
            // Check if new messages arrived (agent sent something)
            const previousLength = messages.length;
            const newLength = serverMessages.length;
            
            if (newLength > previousLength) {
              // New message arrived, hide typing indicator
              setIsAgentTyping(false);
            }
            
            // Replace initial message with server messages
            setMessages(serverMessages);
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    // Load messages once on mount
    loadMessages();
    
    // Set up polling for new messages (less frequent to avoid hydration issues)
    const interval = setInterval(loadMessages, 5000);
    
    return () => clearInterval(interval);
  }, [chatState, conversationId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || chatState !== 'ACTIVE_CHAT' || !conversationId || !customerId) return;

    const message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'customer',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    const messageText = newMessage;
    setNewMessage('');
    
    // Show typing indicator after customer sends message
    setTimeout(() => setIsAgentTyping(true), 500);

    try {
      // Get customer details from session storage
      const customerPhone = sessionStorage.getItem('customer_contact_phone') || '';
      const customerEmail = sessionStorage.getItem('customer_contact_email') || '';
      const customerName = sessionStorage.getItem('customer_contact_name') || '';
      
      // Use the new GHL API route that uses OAuth tokens
      const response = await fetch('/api/chat/send-ghl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: customerPhone,
          message: messageText,
          email: customerEmail,
          name: customerName,
          conversationId: conversationId,
        })
      });

      if (!response.ok) {
        console.error('Failed to send message:', response.statusText);
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, there was an error sending your message. Please try again.',
          sender: 'system',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        const result = await response.json();
        console.log('Message sent via GHL API 2.0 successfully:', result);
        
        // Update conversationId if we got a new one from GHL API 2.0 response
        if (result.success && result.data) {
          if (result.data.conversationId && result.data.conversationId !== conversationId) {
            setConversationId(result.data.conversationId);
            sessionStorage.setItem('customer_conversation_id', result.data.conversationId);
          }
          
          // The contactId should already be set, but we can update if the API returns a new one
          if (result.data.contactId && result.data.contactId !== customerId) {
            setCustomerId(result.data.contactId);
            sessionStorage.setItem('customer_contact_id', result.data.contactId);
          }
        }
        
        // Also store in local database for agent desk visibility
        await fetch('/api/chat-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: messageText,
            type: 'inbound',
            channel: 'webchat',
            conversation: { id: result.data?.conversationId || conversationId },
            contact: {
              id: result.data?.contactId || customerId,
              name: sessionStorage.getItem('customer_contact_name') || undefined,
              email: sessionStorage.getItem('customer_contact_email') || undefined,
              phone: sessionStorage.getItem('customer_contact_phone') || undefined,
            },
            timestamp: new Date().toISOString(),
            source: 'customer_chat'
          })
        }).catch(err => console.warn('Failed to store message locally:', err));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Connection error. Please check your internet connection and try again.',
        sender: 'system',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (chatState === 'IDENTITY_COLLECTION') {
	    return (
	      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
	        <PreChatIdentityForm onStartChat={handleStartChat} isLoading={isLoading} />
	      </div>
	    );
  }

  if (chatState === 'LOADING') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg font-semibold text-blue-600">Starting Conversation...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Customer Support Chat</h1>
            <p className="text-sm text-gray-500">
              {isConnected ? 'Connected - Chat with our support team' : 'Connecting...'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col bg-white shadow-sm">
        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message) => {
            const isCustomer = message.sender === 'customer';
            const isAgent = message.sender === 'agent' || message.sender === 'ai_agent' || message.sender === 'human_agent';
            
            return (
              <div
                key={message.id}
                className={`flex items-end space-x-2 ${isCustomer ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {/* Avatar for agent messages (left side) */}
                {isAgent && (
                  <Avatar className="w-8 h-8 bg-blue-600 text-white flex-shrink-0">
                    <AvatarFallback className="bg-blue-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                {/* Message bubble */}
                <div className="flex flex-col space-y-1 max-w-xs lg:max-w-md">
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      isCustomer
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                  </div>
                  <p className={`text-xs px-1 ${
                    isCustomer ? 'text-right text-gray-500' : 'text-left text-gray-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                {/* Avatar for customer messages (right side) */}
                {isCustomer && (
                  <Avatar className="w-8 h-8 bg-gray-400 text-white flex-shrink-0">
                    <AvatarFallback className="bg-gray-400 text-white text-xs font-semibold">
                      {getInitials(customerName)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
          
          {/* Typing Indicator */}
          {isAgentTyping && (
            <TypingIndicator contactName="Support" isVisible={isAgentTyping} />
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!isConnected}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-gray-500">
            Powered by iKunnect CRM Integration • 
            <span className="ml-1">
              Status: {isConnected ? '🟢 Online' : '🔴 Offline'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
