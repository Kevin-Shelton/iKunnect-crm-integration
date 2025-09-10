'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Sidebar } from '@/components/layout/sidebar';
import { ContactSidebar } from '@/components/layout/contact-sidebar';
import { toast } from 'sonner';

// Mock data for development
const mockConversations = {
  waiting: [
    {
      id: '1',
      contactName: 'John Smith',
      lastMessage: 'Hi, I need help with my account setup. Can someone assist me?',
      lastMessageTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      unreadCount: 2,
      channel: 'chat' as const,
      tags: ['new-customer', 'urgent'],
      waitTime: 5,
      slaStatus: 'normal' as const
    },
    {
      id: '2',
      contactName: 'Sarah Johnson',
      lastMessage: 'I\'m having trouble logging into my dashboard',
      lastMessageTime: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      unreadCount: 1,
      channel: 'chat' as const,
      tags: ['support'],
      waitTime: 12,
      slaStatus: 'warning' as const
    }
  ],
  assigned: [
    {
      id: '3',
      contactName: 'Mike Davis',
      lastMessage: 'Thank you for the help! That resolved my issue.',
      lastMessageTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      unreadCount: 0,
      channel: 'chat' as const,
      tags: ['resolved'],
      assignedTo: 'Agent Smith'
    }
  ],
  all: []
};

// Initialize all conversations
mockConversations.all = [...mockConversations.waiting, ...mockConversations.assigned];

const mockContact = {
  id: '1',
  name: 'John Smith',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '+1 (555) 123-4567',
  city: 'New York',
  state: 'NY',
  tags: ['new-customer', 'urgent', 'vip'],
  dateAdded: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString()
};

const mockOpportunities = [
  {
    id: '1',
    name: 'Enterprise Package Upgrade',
    stage: 'Proposal',
    value: 15000,
    pipeline: 'Sales Pipeline',
    probability: 75,
    closeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const mockAppointments = [
  {
    id: '1',
    title: 'Follow-up Call',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'Phone Call',
    status: 'scheduled' as const
  }
];

export default function ChatDeskPage() {
  const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'away' | 'offline'>('available');
  const [activeTab, setActiveTab] = useState<'waiting' | 'assigned' | 'all'>('waiting');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState(mockConversations);
  const [isLoading, setIsLoading] = useState(false);

  const queueStats = {
    waiting: conversations.waiting.length,
    assigned: conversations.assigned.length,
    total: conversations.all.length
  };

  const handleStatusChange = (status: 'available' | 'busy' | 'away' | 'offline') => {
    setAgentStatus(status);
    toast.success(`Status changed to ${status}`);
  };

  const handleSearch = (query: string) => {
    toast.info(`Searching for: ${query}`);
    // TODO: Implement search functionality
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    toast.info(`Selected conversation: ${conversationId}`);
  };

  const handleConversationClaim = (conversationId: string) => {
    // Move conversation from waiting to assigned
    const conversation = conversations.waiting.find(c => c.id === conversationId);
    if (conversation) {
      const updatedConversation = { ...conversation, assignedTo: 'Current Agent' };
      setConversations(prev => ({
        waiting: prev.waiting.filter(c => c.id !== conversationId),
        assigned: [...prev.assigned, updatedConversation],
        all: prev.all.map(c => c.id === conversationId ? updatedConversation : c)
      }));
      toast.success(`Claimed conversation with ${conversation.contactName}`);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Queue refreshed');
    }, 1000);
  };

  const handleTagContact = (tags: string[]) => {
    toast.success('Contact tags updated');
    // TODO: Implement tag update
  };

  const handleCreateOpportunity = () => {
    toast.info('Create opportunity dialog would open');
    // TODO: Implement opportunity creation
  };

  const handleScheduleCallback = () => {
    toast.info('Schedule callback dialog would open');
    // TODO: Implement callback scheduling
  };

  const handleEscalate = () => {
    toast.info('Escalation dialog would open');
    // TODO: Implement escalation
  };

  const handleCloseConversation = () => {
    if (selectedConversation) {
      toast.success('Conversation closed');
      setSelectedConversation(null);
      // TODO: Implement conversation closing
    }
  };

  // Auto-refresh every 3 seconds (as per FRD)
  useEffect(() => {
    const interval = setInterval(() => {
      // TODO: Fetch latest conversations from API
      console.log('Auto-refreshing conversations...');
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MainLayout
      agentName="Agent Smith"
      agentStatus={agentStatus}
      queueStats={queueStats}
      onStatusChange={handleStatusChange}
      onSearch={handleSearch}
    >
      {/* Left Sidebar - Queue */}
      <Sidebar
        conversations={conversations}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onConversationSelect={handleConversationSelect}
        onConversationClaim={handleConversationClaim}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium mb-2">Chat Interface</div>
              <p className="text-sm">
                Conversation ID: {selectedConversation}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Multi-chat tabs and messaging components will be implemented in the next phases
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium mb-2">Welcome to iKunnect Agent Chat Desk</div>
              <p className="text-sm">
                Select a conversation from the queue to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Context */}
      <ContactSidebar
        contact={selectedConversation ? mockContact : undefined}
        opportunities={selectedConversation ? mockOpportunities : []}
        appointments={selectedConversation ? mockAppointments : []}
        conversationId={selectedConversation || undefined}
        onTagContact={handleTagContact}
        onCreateOpportunity={handleCreateOpportunity}
        onScheduleCallback={handleScheduleCallback}
        onEscalate={handleEscalate}
        onCloseConversation={handleCloseConversation}
      />
    </MainLayout>
  );
}
