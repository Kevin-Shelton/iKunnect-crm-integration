'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  User, 
  MessageSquare, 
  Phone, 
  Mail,
  MoreVertical,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Conversation, ConversationQueue } from '@/lib/types';

import { TailwindConversationCard } from '@/components/queue/tailwind-conversation-card';

interface SidebarProps {
  conversations: ConversationQueue;
  activeTab?: 'waiting' | 'assigned' | 'all' | 'rejected' | 'completed';
  onTabChange?: (tab: 'waiting' | 'assigned' | 'all' | 'rejected' | 'completed') => void;
  onConversationSelect?: (conversationId: string) => void;
  onConversationClaim?: (conversationId: string) => void;
  onConversationPass?: (conversationId: string) => void;
  onConversationReject?: (conversationId: string) => void;
  onConversationRestore?: (conversationId: string) => void;
  onConversationDelete?: (conversationId: string) => void;
  onConversationView?: (conversationId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Sidebar({
  conversations,
  activeTab = 'waiting',
  onTabChange,
  onConversationSelect,
  onConversationClaim,
  onConversationPass,
  onConversationReject,
  onConversationRestore,
  onConversationDelete,
  onConversationView,
  onRefresh,
  isLoading = false
}: SidebarProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filter conversations based on search query
  const filterConversations = (convs: Conversation[]) => {
    if (!searchQuery.trim()) return convs;
    
    const query = searchQuery.toLowerCase();
    return convs.filter(conv => 
      (conv.contactName?.toLowerCase().includes(query)) ||
      (conv.email?.toLowerCase().includes(query)) ||
      (conv.phone?.toLowerCase().includes(query))
    );
  };

  // Paginate conversations
  const paginateConversations = (convs: Conversation[]) => {
    const filtered = filterConversations(convs);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      items: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / itemsPerPage)
    };
  };

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSlaStatusColor = (status?: string) => {
    switch (status) {
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'breach': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId);
    onConversationSelect?.(conversationId);
  };

  const handleClaimClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    onConversationClaim?.(conversationId);
  };

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => (
    <TailwindConversationCard
      key={conversation.id}
      conversation={conversation}
      isSelected={selectedConversation === conversation.id}
      activeTab={activeTab}
      onSelect={() => handleConversationClick(conversation.id)}
      onClaim={() => onConversationClaim?.(conversation.id)}
      onPass={() => console.log('Pass:', conversation.id)}
      onReject={() => console.log('Reject:', conversation.id)}
    />
  );

  return (
    <div className="w-[450px] bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Queue</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => onTabChange?.(value as 'waiting' | 'assigned' | 'all' | 'rejected' | 'completed')}>
          <TabsList className="grid w-full grid-cols-5 text-xs">
            <TabsTrigger value="waiting" className="text-xs px-1">
              Waiting ({conversations?.waiting?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs px-1">
              Assigned ({conversations?.assigned?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-1">
              Done ({conversations?.completed?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs px-1">
              Rejected ({conversations?.rejected?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-1">
              All ({conversations?.all?.length || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <Tabs value={activeTab}>
          <TabsContent value="waiting" className="mt-0">
            {(() => {
              const paginated = paginateConversations(conversations?.waiting || []);
              return (
                <>
                  {paginated.total === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">{searchQuery ? 'No matches found' : 'No waiting conversations'}</p>
                    </div>
                  ) : (
                    <>
                      {paginated.items.map((conversation) => (
                        <TailwindConversationCard
                          key={conversation.id}
                          conversation={conversation}
                          isSelected={selectedConversation === conversation.id}
                          activeTab="waiting"
                          onSelect={() => handleConversationClick(conversation.id)}
                          onClaim={() => onConversationClaim?.(conversation.id)}
                          onPass={() => onConversationPass?.(conversation.id)}
                          onReject={() => onConversationReject?.(conversation.id)}
                        />
                      ))}
                      {/* Pagination Controls */}
                      {paginated.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                          <div className="text-xs text-gray-600">
                            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, paginated.total)} of {paginated.total}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-gray-600 px-2">
                              {currentPage} / {paginated.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.min(paginated.totalPages, p + 1))}
                              disabled={currentPage === paginated.totalPages}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="assigned" className="mt-0">
            {(conversations?.assigned?.length || 0) === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No assigned conversations</p>
              </div>
            ) : (
              (conversations?.assigned || []).map((conversation) => (
                <ConversationItem key={conversation.id} conversation={conversation} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-0">
            {(conversations?.rejected?.length || 0) === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No rejected conversations</p>
              </div>
            ) : (
              (conversations?.rejected || []).map((conversation) => (
                <TailwindConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation === conversation.id}
                  activeTab="rejected"
                  onSelect={() => handleConversationClick(conversation.id)}
                  onClaim={() => onConversationRestore?.(conversation.id)}
                  onPass={() => onConversationDelete?.(conversation.id)}
                  onReject={() => {}}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            {(conversations?.completed?.length || 0) === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No completed conversations</p>
              </div>
            ) : (
              (conversations?.completed || []).map((conversation) => (
                <TailwindConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation === conversation.id}
                  activeTab="completed"
                  onSelect={() => handleConversationClick(conversation.id)}
                  onClaim={() => {}}
                  onPass={() => {}}
                  onReject={() => {}}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            {(conversations?.all?.length || 0) === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No conversations</p>
              </div>
            ) : (
              (conversations?.all || []).map((conversation) => (
                <ConversationItem key={conversation.id} conversation={conversation} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

