'use client';

import React, { useState, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';

export default function CustomerChatPage() {
  // Generate consistent session IDs that persist during the chat session
  const [conversationId] = useState(() => {
    if (typeof window !== 'undefined') {
      // Try to get existing conversation ID from session storage
      let existingId = sessionStorage.getItem('customer_conversation_id');
      if (!existingId) {
        // Generate new ID only if none exists
        existingId = `customer_chat_${Date.now()}`;
        sessionStorage.setItem('customer_conversation_id', existingId);
      }
      return existingId;
    }
    return `customer_chat_${Date.now()}`;
  });
  
  const [customerId] = useState(() => {
    if (typeof window !== 'undefined') {
      let existingCustomerId = sessionStorage.getItem('customer_id');
      if (!existingCustomerId) {
        existingCustomerId = `customer_${Date.now()}`;
        sessionStorage.setItem('customer_id', existingCustomerId);
      }
      return existingCustomerId;
    }
    return `customer_${Date.now()}`;
  });
  
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Hello! How can I help you today?',
      sender: 'agent',
      timestamp: new Date().toISOString()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  // Load initial messages and poll for updates (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return; // Prevent SSR issues
    
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages && data.messages.length > 0) {
            const serverMessages = data.messages.map((msg: any) => ({
              id: msg.id,
              text: msg.text || '',
              sender: msg.sender === 'customer' ? 'customer' : 'agent',
              timestamp: msg.timestamp
            }));
            
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
  }, [conversationId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'customer',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    const messageText = newMessage;
    setNewMessage('');

    try {
      // Store message in database using existing chat-events API (same as n8n does)
      const response = await fetch('/api/chat-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageText,
          type: 'inbound',
          channel: 'webchat',
          conversation: {
            id: conversationId
          },
          contact: {
            id: customerId
          },
          timestamp: new Date().toISOString(),
          source: 'customer_chat'
        })
      });

      if (!response.ok) {
        console.error('Failed to store message:', response.statusText);
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, there was an error sending your message. Please try again.',
          sender: 'system',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        console.log('Message stored successfully');
        // Show confirmation - n8n will process and respond via existing webhook
        const confirmMessage = {
          id: (Date.now() + 1).toString(),
          text: 'Message sent. An agent will respond shortly.',
          sender: 'system',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, confirmMessage]);
        
        // TODO: Add polling or WebSocket to get real-time responses from n8n
        // For now, customer will see responses when they refresh or via agent interface
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
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'customer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'customer' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
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
