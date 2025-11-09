'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleMessages } from './simple-messages';
import { AgentReply } from './agent-reply';
import { AgentAssist } from './agent-assist';
import { X, MessageSquare, Users, Clock, AlertCircle, User, Move, Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSSEService } from '@/lib/sse-service';


// Define the new state for the chat desk
type ChatDeskState = 'LOADING' | 'ACTIVE_CHAT_DESK';

interface ChatBox {
  contactEmail?: string;
  contactPhone?: string;
  contactId: string; // Add contactId to ChatBox interface
  id: string;
  conversationId: string;
  contactName: string;
  lastActivity: string;
  unreadCount: number;
  status: 'active' | 'waiting' | 'typing';
  isTyping?: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  zIndex: number;
  isActive: boolean; // New: indicates which chat is currently active for context
  agentAssistActive: boolean; // New: indicates if Agent Assist is enabled for this chat
}

interface DraggableMultiChatProps {
  onNewMessage?: (message: any) => void;
  onChatClosed?: (conversationId: string) => void;
  onActiveChanged?: (conversationId: string | null) => void;
  maxChats?: number;
}

export function DraggableMultiChat({ 
  onNewMessage, 
  onChatClosed, 
  onActiveChanged,
  maxChats = 4 
}: DraggableMultiChatProps) {
  const [chatDeskState, setChatDeskState] = useState<ChatDeskState>('ACTIVE_CHAT_DESK');
  const [chatBoxes, setChatBoxes] = useState<ChatBox[]>([]);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    chatId: string | null;
    offset: { x: number; y: number };
  }>({ isDragging: false, chatId: null, offset: { x: 0, y: 0 } });
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    chatId: string | null;
    startPos: { x: number; y: number };
    startSize: { width: number; height: number };
  }>({ isResizing: false, chatId: null, startPos: { x: 0, y: 0 }, startSize: { width: 0, height: 0 } });
  const [nextZIndex, setNextZIndex] = useState(1000);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const sseService = getSSEService();



  // Expose methods globally for external access
  useEffect(() => {
    (window as any).draggableMultiChat = {
      addChat,
      removeChat,
      chatBoxes,
      activeChatId
    };
    
    return () => {
      delete (window as any).draggableMultiChat;
    };
  }, [chatBoxes, activeChatId]);

  // Default chat box size and positions
  const defaultSize = { width: 400, height: 500 };
  const getDefaultPosition = (index: number) => {
    const offset = index * 30;
    return { x: 100 + offset, y: 100 + offset };
  };

  // Add a new chat box
  const addChat = (conversationId: string, contactName: string, contactId: string, contactEmail?: string, contactPhone?: string) => {
    if (chatBoxes.length >= maxChats) {
      alert(`Maximum of ${maxChats} chats allowed. Please close a chat first.`);
      return false;
    }

    const existingChat = chatBoxes.find(chat => chat.conversationId === conversationId);
    if (existingChat) {
      // Bring existing chat to front and make it active
      bringToFront(existingChat.id);
      setActiveChatId(existingChat.id);
      return true;
    }

    const chatId = `chat-${conversationId}-${Date.now()}`;
    
    const newChat: ChatBox = {
      contactId,
      contactEmail,
      contactPhone,
      id: chatId,
      conversationId,
      contactName,
      lastActivity: new Date().toISOString(),
      unreadCount: 0,
      status: 'active',
      position: getDefaultPosition(chatBoxes.length),
      size: { ...defaultSize },
      isMinimized: false,
      zIndex: nextZIndex,
      isActive: chatBoxes.length === 0, // First chat is automatically active
      agentAssistActive: false // Agent Assist starts disabled
    };

    setChatBoxes(prev => [...prev, newChat]);
    setNextZIndex(prev => prev + 1);
    
    // Set as active chat if it's the first one
    if (chatBoxes.length === 0) {
      setActiveChatId(newChat.id);
      onActiveChanged?.(conversationId);
    }

    return true;
  };

  // Remove a chat box
  const removeChat = (chatId: string) => {
    const chat = chatBoxes.find(c => c.id === chatId);
    if (chat) {
      setChatBoxes(prev => prev.filter(c => c.id !== chatId));
      onChatClosed?.(chat.conversationId);
      
      // If this was the active chat, set another as active
      if (activeChatId === chatId) {
        const remainingChats = chatBoxes.filter(c => c.id !== chatId);
        if (remainingChats.length > 0) {
          const newActiveId = remainingChats[0].id;
          setActiveChatId(newActiveId);

          onActiveChanged?.(remainingChats[0].conversationId);
        } else {
          setActiveChatId(null);
          onActiveChanged?.(null);
        }
      }
    }
  };

  // Bring chat to front
  const bringToFront = (chatId: string) => {
    setChatBoxes(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, zIndex: nextZIndex }
        : chat
    ));
    setNextZIndex(prev => prev + 1);
  };

  // Set active chat
  const setActiveChatHandler = (chatId: string) => {
    const chat = chatBoxes.find(c => c.id === chatId);
    if (chat) {
      setChatBoxes(prev => prev.map(c => ({ ...c, isActive: c.id === chatId })));
      setActiveChatId(chatId);

      onActiveChanged?.(chat.conversationId);
      bringToFront(chatId);
    }
  };

  // Toggle minimize
  const toggleMinimize = (chatId: string) => {
    setChatBoxes(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, isMinimized: !chat.isMinimized }
        : chat
    ));
  };

  // Handle end chat
  const handleEndChat = async (conversationId: string) => {
    if (confirm('Are you sure you want to end this chat? This will close the conversation.')) {
      try {
        // Call API to end the conversation
        const response = await fetch('/api/chat/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, agentId: 'agent_1' })
        });

        if (response.ok) {
          // Remove the chat from the interface
          const chatToRemove = chatBoxes.find(chat => chat.conversationId === conversationId);
          if (chatToRemove) {
            removeChat(chatToRemove.id);
          }
        } else {
          alert('Failed to end chat. Please try again.');
        }
      } catch (error) {
        console.error('Error ending chat:', error);
        alert('Error ending chat. Please try again.');
      }
    }
  };

  // Mouse event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent, chatId: string, action: 'drag' | 'resize') => {
    e.preventDefault();
    bringToFront(chatId);
    setActiveChatHandler(chatId);

    const chat = chatBoxes.find(c => c.id === chatId);
    if (!chat) return;

    if (action === 'drag') {
      setDragState({
        isDragging: true,
        chatId,
        offset: {
          x: e.clientX - chat.position.x,
          y: e.clientY - chat.position.y
        }
      });
    } else if (action === 'resize') {
      setResizeState({
        isResizing: true,
        chatId,
        startPos: { x: e.clientX, y: e.clientY },
        startSize: { ...chat.size }
      });
    }
  };

  // Global mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging && dragState.chatId) {
        setChatBoxes(prev => prev.map(chat => 
          chat.id === dragState.chatId 
            ? {
                ...chat,
                position: {
                  x: Math.max(0, e.clientX - dragState.offset.x),
                  y: Math.max(0, e.clientY - dragState.offset.y)
                }
              }
            : chat
        ));
      }

      if (resizeState.isResizing && resizeState.chatId) {
        const deltaX = e.clientX - resizeState.startPos.x;
        const deltaY = e.clientY - resizeState.startPos.y;
        
        setChatBoxes(prev => prev.map(chat => 
          chat.id === resizeState.chatId 
            ? {
                ...chat,
                size: {
                  width: Math.max(300, resizeState.startSize.width + deltaX),
                  height: Math.max(200, resizeState.startSize.height + deltaY)
                }
              }
            : chat
        ));
      }
    };

    const handleMouseUp = () => {
      setDragState({ isDragging: false, chatId: null, offset: { x: 0, y: 0 } });
      setResizeState({ isResizing: false, chatId: null, startPos: { x: 0, y: 0 }, startSize: { width: 0, height: 0 } });
    };

    if (dragState.isDragging || resizeState.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState]);

  // SSE typing indicators
  useEffect(() => {
    if (!sseService) return;

    const handleTypingIndicator = (data: any) => {
      const { conversationId, userType, isTyping } = data;
      
      setChatBoxes(prev => prev.map(chat => 
        chat.conversationId === conversationId 
          ? { 
              ...chat, 
              isTyping: userType === 'customer' ? isTyping : chat.isTyping,
              status: isTyping && userType === 'customer' ? 'typing' : 'active'
            }
          : chat
      ));
    };

    const unsubscribe = sseService.subscribe('typing', handleTypingIndicator);

    return unsubscribe;
  }, [sseService]);

  // Handle new messages
  const handleNewMessage = (message: any) => {
    setChatBoxes(prev => prev.map(chat => 
      chat.conversationId === message.conversationId 
        ? { 
            ...chat, 
            lastActivity: new Date().toISOString(),
            unreadCount: chat.isActive ? 0 : chat.unreadCount + 1,
            isTyping: false,
            status: 'active'
          }
        : chat
    ));
    onNewMessage?.(message);
  };

  // Handle agent typing
  const handleAgentTyping = (conversationId: string, isTyping: boolean) => {
    if (sseService && isTyping) {
      sseService.sendTyping(conversationId, 'agent');
    }
    // Note: SSE service doesn't have a stop typing method, it auto-expires
  };

  // Expose functions globally
  useEffect(() => {
    (window as any).draggableMultiChat = {
      addChat,
      removeChat,
      setActiveChat: setActiveChatHandler,
      activeChats: chatBoxes.length,
      maxChats,
      activeChatId
    };

    return () => {
      if ((window as any).draggableMultiChat) {
        delete (window as any).draggableMultiChat;
      }
    };
  }, [chatBoxes, maxChats, activeChatId]);



  // Original rendering logic for when chatBoxes.length === 0 is now inside the ACTIVE_CHAT_DESK state
  if (chatBoxes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Draggable Multi-Chat Agent Desk
          </h2>
          <p className="text-gray-600 mb-4">
            Handle up to {maxChats} simultaneous conversations. Drag and resize chat windows as needed.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center mb-2">
              <Users className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">Advanced Multi-Chat Ready</span>
            </div>
            <p className="text-blue-700 text-sm">
              • Drag chat windows around the screen<br/>
              • Resize windows to fit your workflow<br/>
              • Real-time typing indicators<br/>
              • Active chat context management
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {chatBoxes.map((chat) => {
        const activeColor = chat.isActive ? 'border-green-500 shadow-green-200' : 'border-gray-300';
        const headerColor = chat.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200';
        
        return (
          <div
            key={chat.id}
            className={`absolute bg-white border-2 rounded-lg shadow-lg ${activeColor} ${
              chat.isActive ? 'shadow-lg' : 'shadow-md'
            }`}
            style={{
              left: chat.position.x,
              top: chat.position.y,
              width: chat.size.width,
              height: chat.isMinimized ? 'auto' : chat.size.height,
              zIndex: chat.zIndex,
              cursor: dragState.isDragging && dragState.chatId === chat.id ? 'grabbing' : 'default'
            }}
            onClick={() => setActiveChatHandler(chat.id)}
          >
            {/* Chat Header */}
            <div 
              className={`border-b-2 p-3 ${headerColor} rounded-t-lg cursor-grab active:cursor-grabbing`}
              onMouseDown={(e) => handleMouseDown(e, chat.id, 'drag')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full ${
                    chat.isActive ? 'bg-blue-500' :
                    chat.status === 'typing' ? 'bg-yellow-400' :
                    chat.status === 'active' ? 'bg-green-400' :
                    'bg-gray-400'
                  }`} />
                  <Move className="w-4 h-4 text-gray-500" />
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900 truncate">{chat.contactName}</span>
                  {chat.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                      {chat.unreadCount}
                    </Badge>
                  )}
                  {chat.isActive && (
                    <Badge variant="default" className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800">
                      Active
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-xs px-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEndChat(chat.conversationId);
                    }}
                    title="End Chat"
                  >
                    End
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMinimize(chat.id);
                    }}
                  >
                    {chat.isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChat(chat.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Typing Indicators */}
              {chat.isTyping && (
                <div className="mt-2 text-xs text-gray-500 italic">
                  Customer is typing...
                </div>
              )}
            </div>

            {/* Chat Content */}
            {!chat.isMinimized && (
              <div className="flex flex-col" style={{ height: chat.size.height - 60 }}>
                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                  <SimpleMessages 
                    conversationId={chat.conversationId}
                    onNewMessage={handleNewMessage}
                    compact={true}
                  />
                </div>
                
                {/* Agent Reply */}
                <div className="border-t border-gray-200">
                  <AgentReply
                    conversationId={chat.conversationId}
                    onMessageSent={() => {
                      setChatBoxes(prev => prev.map(c => 
                        c.id === chat.id 
                          ? { ...c, lastActivity: new Date().toISOString() }
                          : c
                      ));
                    }}
                    onTyping={(isTyping) => handleAgentTyping(chat.conversationId, isTyping)}
                    compact={true}
                  />
                </div>

                {/* Agent Assist */}
                  <AgentAssist
                    contactId={chat.contactId}
                  conversationId={chat.conversationId}
                  contactName={chat.contactName}
                  contactEmail={chat.contactEmail}
                  contactPhone={chat.contactPhone}
                  isActive={chat.agentAssistActive}
                  onSuggestionSelect={(suggestion) => {
                    // Insert suggestion into the reply field
                    // This would need to be implemented in AgentReply component
                    console.log('[Agent Assist] Suggestion selected:', suggestion);
                  }}
                  onToggle={() => {
                    setChatBoxes(prev => prev.map(c => 
                      c.id === chat.id 
                        ? { ...c, agentAssistActive: !c.agentAssistActive }
                        : c
                    ));
                  }}
                />
              </div>
            )}

            {/* Resize Handle */}
            {!chat.isMinimized && (
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400"
                style={{ 
                  clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)',
                }}
                onMouseDown={(e) => handleMouseDown(e, chat.id, 'resize')}
              />
            )}
          </div>
        );
      })}

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Active Chats: {chatBoxes.filter(c => !c.isMinimized).length}</span>
            <span>Total: {chatBoxes.length}/{maxChats}</span>
            {activeChatId && (
              <span className="text-blue-600 font-medium">
                Context: {chatBoxes.find(c => c.id === activeChatId)?.contactName}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <MessageSquare className="w-3 h-3" />
            <span>Draggable Multi-Chat</span>
            {sseService?.isConnected() && <span className="text-green-600">• Live</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
