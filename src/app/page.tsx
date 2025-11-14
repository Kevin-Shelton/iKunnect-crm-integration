'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { DraggableMultiChat } from '@/components/chat/draggable-multi-chat';
import { ContactSidebar } from '@/components/layout/contact-sidebar';
import { NotificationSystem } from '@/components/chat/notification-system';
import { useConversations } from '@/hooks/use-conversations';
import { tokenStore } from '@/lib/ghl-api-2.0';
import { Conversation, ConversationQueue } from '@/lib/types';

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'waiting' | 'assigned' | 'all' | 'rejected'>('waiting');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check authorization status on load
  useEffect(() => {
    if (tokenStore.getAccessToken()) {
      setIsAuthorized(true);
    }
  }, []);

  // Use conversations hook with safe defaults
  const {
    conversations = { waiting: [], assigned: [], rejected: [], all: [] } as ConversationQueue,
    queueStats = { waiting: 0, assigned: 0, total: 0 },
    isLoading = false,
    error = null,
    refreshConversations = () => {}
  } = useConversations() || {};

  // Claim chat functionality
  const claimChat = async (conversationId: string) => {
    try {
      console.log('=== CLAIM CHAT DEBUG START ===');
      console.log('Attempting to claim conversation:', conversationId);
      console.log('window.draggableMultiChat exists?', !!(window as any).draggableMultiChat);
      console.log('window.draggableMultiChat value:', (window as any).draggableMultiChat);
      
      // Find the conversation to get contact details BEFORE claiming
      const conversation = conversations.all?.find((conv: Conversation) => conv.id === conversationId);
      if (!conversation) {
        console.error('Conversation not found in local data:', conversationId);
        alert('Conversation not found. Please refresh and try again.');
        return;
      }
      console.log('Found conversation:', conversation);
      
      const response = await fetch('/api/chat/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, agentId: 'agent_1' })
      });

      const data = await response.json();
      console.log('Claim response:', data);
      
      if (data.success) {
        console.log('Chat claimed successfully');
        
        // Extract contact details from conversation
        const contactName = conversation.contactName || conversation.fullName || `Customer ${conversationId.slice(-4)}`;
        const contactId = conversation.contactId || conversationId.replace('conv_', 'contact_');
        const contactEmail = conversation.email;
        const contactPhone = conversation.phone;
        
        console.log('Adding chat with details:', { conversationId, contactName, contactId, contactEmail, contactPhone });
        
        // Add to draggable multi-chat interface with full contact details
        console.log('Checking for draggableMultiChat...');
        if ((window as any).draggableMultiChat) {
          console.log('draggableMultiChat found! Calling addChat...');
          console.log('Parameters:', { conversationId, contactName, contactId, contactEmail, contactPhone });
          
          const added = (window as any).draggableMultiChat.addChat(
            conversationId, 
            contactName, 
            contactId,
            contactEmail,
            contactPhone
          );
          
          console.log('addChat returned:', added);
          console.log('Current chatBoxes:', (window as any).draggableMultiChat.chatBoxes);
          
          if (!added) {
            alert('Cannot add more chats. Maximum of 4 simultaneous chats allowed.');
            return;
          }
          console.log('Chat window added successfully');
        } else {
          console.error('DraggableMultiChat not available on window object');
          console.error('window keys:', Object.keys(window));
          alert('Chat interface not ready. Please refresh the page.');
        }
        console.log('=== CLAIM CHAT DEBUG END ===');
        
        refreshConversations(); // Refresh the conversation list
        setSelectedConversationId(conversationId); // Auto-select the claimed conversation
        
        // Play new conversation notification
        handleNewConversation(conversation);
      } else {
        console.error('Failed to claim chat:', data.error);
        alert(`Failed to claim chat: ${data.error}`);
      }
    } catch (error) {
      console.error('Error claiming chat:', error);
      alert(`Error claiming chat: ${error}`);
    }
  };

  // Pass chat functionality
  const passChat = async (conversationId: string) => {
    try {
      console.log('Attempting to pass conversation:', conversationId);
      
      const response = await fetch('/api/chat/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, agentId: 'agent_1' })
      });

      const data = await response.json();
      console.log('Pass response:', data);
      
      if (data.success) {
        console.log('Chat passed successfully');
        refreshConversations(); // Refresh the conversation list
        
        // Show notification
        if (notificationsEnabled && (window as any).notificationSystem) {
          (window as any).notificationSystem.showNotification(
            'Chat Passed',
            'Conversation moved to back of queue',
            'info'
          );
        }
      } else {
        console.error('Failed to pass chat:', data.error);
        alert(`Failed to pass chat: ${data.error}`);
      }
    } catch (error) {
      console.error('Error passing chat:', error);
      alert(`Error passing chat: ${error}`);
    }
  };

  // Reject chat functionality
  const rejectChat = async (conversationId: string) => {
    try {
      console.log('Attempting to reject conversation:', conversationId);
      
      const response = await fetch('/api/chat/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId, 
          agentId: 'agent_1',
          reason: 'Agent rejected - not suitable for handling'
        })
      });

      const data = await response.json();
      console.log('Reject response:', data);
      
      if (data.success) {
        console.log('Chat rejected successfully');
        refreshConversations(); // Refresh the conversation list
        
        // Show notification
        if (notificationsEnabled && (window as any).notificationSystem) {
          (window as any).notificationSystem.showNotification(
            'Chat Rejected',
            'Conversation removed from queue',
            'warning'
          );
        }
      } else {
        console.error('Failed to reject chat:', data.error);
        alert(`Failed to reject chat: ${data.error}`);
      }
    } catch (error) {
      console.error('Error rejecting chat:', error);
      alert(`Error rejecting chat: ${error}`);
    }
  };

  // Restore rejected chat functionality
  const restoreChat = async (conversationId: string) => {
    try {
      console.log('Attempting to restore conversation:', conversationId);
      
      const response = await fetch('/api/chat/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, agentId: 'agent_1' })
      });

      const data = await response.json();
      console.log('Restore response:', data);
      
      if (data.success) {
        console.log('Chat restored successfully');
        refreshConversations(); // Refresh the conversation list
        
        // Show notification
        if (notificationsEnabled && (window as any).notificationSystem) {
          (window as any).notificationSystem.showNotification(
            'Chat Restored',
            'Conversation moved back to waiting queue',
            'success'
          );
        }
      } else {
        console.error('Failed to restore chat:', data.error);
        alert(`Failed to restore chat: ${data.error}`);
      }
    } catch (error) {
      console.error('Error restoring chat:', error);
      alert(`Error restoring chat: ${error}`);
    }
  };

  // Permanently delete rejected chat functionality
  const permanentDeleteChat = async (conversationId: string) => {
    try {
      console.log('Attempting to permanently delete conversation:', conversationId);
      
      const response = await fetch('/api/chat/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, agentId: 'agent_1' })
      });

      const data = await response.json();
      console.log('Delete response:', data);
      
      if (data.success) {
        console.log('Chat deleted permanently');
        refreshConversations(); // Refresh the conversation list
        
        // Show notification
        if (notificationsEnabled && (window as any).notificationSystem) {
          (window as any).notificationSystem.showNotification(
            'Chat Deleted',
            'Conversation permanently removed',
            'warning'
          );
        }
      } else {
        console.error('Failed to delete chat:', data.error);
        alert(`Failed to delete chat: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert(`Error deleting chat: ${error}`);
    }
  };

  // View rejected chat functionality
  const viewRejectedChat = async (conversationId: string) => {
    try {
      console.log('Viewing rejected conversation:', conversationId);
      
      // Add to draggable multi-chat interface for viewing
      const conversation = conversations.all?.find((conv: Conversation) => conv.id === conversationId);
      if (!conversation) {
        alert('Conversation not found. Please refresh and try again.');
        return;
      }
      
      const contactName = conversation.contactName || conversation.fullName || `Customer ${conversationId.slice(-4)}`;
      const contactId = conversation.contactId || conversationId.replace('conv_', 'contact_');
      
      if ((window as any).draggableMultiChat) {
        const added = (window as any).draggableMultiChat.addChat(
          conversationId, 
          contactName,
          contactId,
          conversation.email,
          conversation.phone
        );
        if (!added) {
          alert('Cannot view chat. Maximum of 4 simultaneous chats allowed. Please close a chat first.');
          return;
        }
      }
      
      setSelectedConversationId(conversationId);
    } catch (error) {
      console.error('Error viewing rejected chat:', error);
      alert(`Error viewing chat: ${error}`);
    }
  };

  // Handle new message notifications
  const handleNewMessage = (message: any) => {
    if (notificationsEnabled && (window as any).notificationSystem) {
      (window as any).notificationSystem.playIncomingBeep();
      (window as any).notificationSystem.showNotification(
        'New Message',
        `${message.contact?.name || 'Customer'}: ${message.text}`,
        'incoming'
      );
    }
  };

  // Handle new conversation notifications
  const handleNewConversation = (conversation: any) => {
    if (notificationsEnabled && (window as any).notificationSystem) {
      (window as any).notificationSystem.playNewConversationAlert();
      (window as any).notificationSystem.showNotification(
        'New Conversation',
        `New chat from ${conversation.contactName || 'Customer'}`,
        'new'
      );
    }
  };

  // Handle dropped chat notifications
  const handleDroppedChat = (conversation: any) => {
    if (notificationsEnabled && (window as any).notificationSystem) {
      (window as any).notificationSystem.playDroppedBuzz();
      (window as any).notificationSystem.showNotification(
        'Chat Dropped',
        `Conversation with ${conversation.contactName || 'Customer'} was dropped`,
        'dropped'
      );
    }
  };

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
    console.log('Selecting conversation:', conversationId);
    setSelectedConversationId(conversationId);
    
    const conversation = conversations.all?.find((conv: Conversation) => conv.id === conversationId);
    if (conversation) {
      setSelectedContact(contactData);
      
      // Open in draggable multi-chat interface with full contact details
      const contactName = conversation.contactName || conversation.fullName || `Customer ${conversationId.slice(-4)}`;
      const contactId = conversation.contactId || conversationId.replace('conv_', 'contact_');
      const contactEmail = conversation.email;
      const contactPhone = conversation.phone;
      
      if ((window as any).draggableMultiChat) {
        const added = (window as any).draggableMultiChat.addChat(
          conversationId, 
          contactName,
          contactId,
          contactEmail,
          contactPhone
        );
        if (!added) {
          alert('Cannot open chat. Maximum of 4 simultaneous chats allowed. Please close a chat first.');
          return;
        }
        console.log('Chat opened in multi-chat interface');
      } else {
        console.warn('Draggable multi-chat interface not available');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <p className="text-slate-600 text-lg font-medium">Loading conversations...</p>
            <p className="text-slate-400 text-sm mt-2">Setting up your workspace</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl border border-red-100">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">Connection Error</h3>
            <p className="text-red-600 mb-6 text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAuthorize = () => {
    window.location.href = '/api/ghl-oauth-init';
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center p-10 bg-white rounded-xl shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">GoHighLevel Authorization Required</h1>
          <p className="text-lg text-gray-600 mb-8">Please authorize the application to access your GHL account to proceed.</p>
          <button 
            onClick={handleAuthorize} 
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition duration-200"
          >
            Authorize with GoHighLevel
          </button>
          <p className="text-sm text-gray-400 mt-4">Note: This will redirect you to the GHL login page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header 
          queueStats={queueStats}
          agentName="Agent"
          agentStatus="available"
        />
      </div>

      {/* Notification System */}
      <NotificationSystem 
        enabled={notificationsEnabled}
        onToggle={() => setNotificationsEnabled(!notificationsEnabled)}
      />

      {/* Main Content */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200">
          <Sidebar
            conversations={conversations}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onConversationSelect={(conversationId) => {
              console.log('Conversation selected:', conversationId);
              setSelectedConversationId(conversationId);
              // Also show in draggable multi-chat if not already there
              const conversation = conversations.all?.find((conv: Conversation) => conv.id === conversationId);
              if (conversation && (window as any).draggableMultiChat) {
                const contactName = conversation.contactName || conversation.fullName || `Customer ${conversationId.slice(-4)}`;
                const contactId = conversation.contactId || conversationId.replace('conv_', 'contact_');
                (window as any).draggableMultiChat.addChat(
                  conversationId, 
                  contactName,
                  contactId,
                  conversation.email,
                  conversation.phone
                );
              }
            }}
            onConversationClaim={claimChat}
            onConversationPass={passChat}
            onConversationReject={rejectChat}
            onConversationRestore={restoreChat}
            onConversationDelete={permanentDeleteChat}
            onConversationView={viewRejectedChat}
            onRefresh={refreshConversations}
            isLoading={isLoading}
          />
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex">
          <div className="flex-1">
            <DraggableMultiChat 
              onNewMessage={handleNewMessage}
              onChatClosed={(conversationId) => {
                // Handle chat closed - could update conversation status
                console.log('Chat closed:', conversationId);
              }}
              onActiveChanged={(conversationId) => {
                // Handle active chat changed for context
                console.log('Active chat changed:', conversationId);
                setSelectedConversationId(conversationId);
              }}
              maxChats={4}
            />
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

