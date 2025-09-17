'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  text: string;
  type: 'customer' | 'agent' | 'system';
  timestamp: Date;
}

interface Suggestion {
  text: string;
  reason?: string | null;
  confidence?: number | null;
  rank: number;
}

interface ChatSession {
  conversationId: string;
  token: string;
  lang: string;
  channel: string;
}

export default function CustomerChatPage() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [language, setLanguage] = useState('en');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Initialize chat session
  useEffect(() => {
    initializeChat();
  }, []);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(session.channel)
      .on('broadcast', { event: 'event' }, (payload) => {
        handleRealtimeEvent(payload.payload);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        console.log('[Chat] Realtime status:', status);
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [session]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('chat-language') || 'en';
    setLanguage(savedLang);
  }, []);

  const initializeChat = async () => {
    try {
      const response = await fetch('/api/livechat/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: language })
      });

      const data = await response.json();
      if (data.ok) {
        setSession({
          conversationId: data.conversation.id,
          token: data.conversation.token,
          lang: data.lang,
          channel: data.channel
        });
        console.log('[Chat] Session initialized:', data.conversation.id);
      }
    } catch (error) {
      console.error('[Chat] Failed to initialize:', error);
    }
  };

  const handleRealtimeEvent = (event: any) => {
    console.log('[Chat] Received event:', event);

    switch (event.type) {
      case 'inbound':
        // Echo of our own message
        setMessages(prev => prev.map(msg => 
          msg.id === event.messageId 
            ? { ...msg, type: 'customer' as const }
            : msg
        ));
        break;

      case 'agent_send':
        addMessage({
          id: event.messageId || `agent_${Date.now()}`,
          text: event.text,
          type: 'agent',
          timestamp: new Date()
        });
        break;

      case 'suggestions':
        if (event.items && Array.isArray(event.items)) {
          setSuggestions(event.items.sort((a: Suggestion, b: Suggestion) => a.rank - b.rank));
        }
        break;

      default:
        console.log('[Chat] Unknown event type:', event.type);
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = async (text: string) => {
    if (!session || !text.trim() || isLoading) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const message: Message = {
      id: messageId,
      text: text.trim(),
      type: 'customer',
      timestamp: new Date()
    };

    // Optimistically add message
    addMessage(message);
    setCurrentMessage('');
    setIsLoading(true);
    setSuggestions([]); // Clear old suggestions

    try {
      const response = await fetch('/api/livechat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: { id: session.conversationId },
          message: { id: messageId, text: text.trim() },
          lang: language,
          channel: 'webchat'
        })
      });

      const data = await response.json();
      if (!data.ok) {
        console.error('[Chat] Send failed:', data.error);
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (error) {
      console.error('[Chat] Send error:', error);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentMessage);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion, action: 'insert' | 'send') => {
    if (action === 'insert') {
      setCurrentMessage(suggestion.text);
    } else {
      sendMessage(suggestion.text);
    }
  };

  const changeLanguage = (newLang: string) => {
    setLanguage(newLang);
    localStorage.setItem('chat-language', newLang);
    if (session) {
      setSession(prev => prev ? { ...prev, lang: newLang } : null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Customer Support Chat</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
          
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
          </select>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full flex">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>Welcome! How can we help you today?</p>
                <p className="text-sm mt-2">Language: {language.toUpperCase()}</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'customer' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.type === 'customer'
                      ? 'bg-blue-500 text-white'
                      : message.type === 'agent'
                      ? 'bg-gray-200 text-gray-900'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex space-x-2">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                maxLength={2000}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(currentMessage)}
                disabled={!currentMessage.trim() || isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {currentMessage.length}/2000 characters
            </div>
          </div>
        </div>

        {/* Suggestions Panel */}
        {suggestions.length > 0 && (
          <div className="w-80 border-l border-gray-200 bg-white p-4">
            <h3 className="font-medium text-gray-900 mb-3">AI Suggestions</h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <p className="text-sm text-gray-900 mb-2">{suggestion.text}</p>
                  {suggestion.reason && (
                    <p className="text-xs text-gray-600 mb-2">{suggestion.reason}</p>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSuggestionClick(suggestion, 'insert')}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Insert
                    </button>
                    <button
                      onClick={() => handleSuggestionClick(suggestion, 'send')}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Send
                    </button>
                  </div>
                  {suggestion.confidence && (
                    <div className="text-xs text-gray-500 mt-1">
                      Confidence: {Math.round(suggestion.confidence * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

