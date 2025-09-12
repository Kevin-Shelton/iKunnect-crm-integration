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
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Conversation, ConversationQueue } from '@/lib/types';

interface SidebarProps {
  conversations: ConversationQueue;
  activeTab?: 'waiting' | 'assigned' | 'all';
  onTabChange?: (tab: 'waiting' | 'assigned' | 'all') => void;
  onConversationSelect?: (conversationId: string) => void;
  onConversationClaim?: (conversationId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Sidebar({
  conversations,
  activeTab = 'waiting',
  onTabChange,
  onConversationSelect,
  onConversationClaim,
  onRefresh,
  isLoading = false
}: SidebarProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

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
    <div
      key={conversation.id}
      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
        selectedConversation === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
      onClick={() => handleConversationClick(conversation.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="text-blue-500">
            {getChannelIcon(conversation.channel || 'chat')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {conversation.contactName}
            </p>
            <p className="text-xs text-gray-500">
              {(() => {
                try {
                  const dateValue = conversation.lastMessageDate;
                  if (!dateValue) return 'No messages';
                  const date = new Date(dateValue);
                  if (isNaN(date.getTime())) return 'Invalid date';
                  return formatDistanceToNow(date, { addSuffix: true });
                } catch (error) {
                  return 'Unknown time';
                }
              })()}
            </p>
          </div>
          {(conversation.unreadCount ?? 0) > 0 && (
            <Badge variant="default" className="bg-blue-500 text-white text-xs px-1.5 py-0.5">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <MoreVertical className="h-3 w-3" />
        </Button>
      </div>

      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
        {conversation.lastMessageBody}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {(conversation.tags || []).slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5">
              {tag}
            </Badge>
          ))}
          {(conversation.tags || []).length > 2 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              +{(conversation.tags || []).length - 2}
            </Badge>
          )}
        </div>

        {conversation.waitTime && (
          <Badge 
            variant="outline" 
            className={`text-xs px-1.5 py-0.5 ${getSlaStatusColor(conversation.slaStatus)}`}
          >
            <Clock className="h-3 w-3 mr-1" />
            {conversation.waitTime}m
          </Badge>
        )}
      </div>

      {activeTab === 'waiting' && (
        <div className="mt-2">
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={(e) => handleClaimClick(e, conversation.id)}
          >
            Claim Chat
          </Button>
        </div>
      )}

      {conversation.assignedTo && (
        <div className="mt-2 flex items-center text-xs text-gray-500">
          <User className="h-3 w-3 mr-1" />
          Assigned to {conversation.assignedTo}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
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

        <Tabs value={activeTab} onValueChange={(value) => onTabChange?.(value as 'waiting' | 'assigned' | 'all')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="waiting" className="text-xs">
              Waiting ({conversations.waiting.length})
            </TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs">
              Assigned ({conversations.assigned.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              All ({conversations.all.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <Tabs value={activeTab}>
          <TabsContent value="waiting" className="mt-0">
            {conversations.waiting.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No waiting conversations</p>
              </div>
            ) : (
              conversations.waiting.map((conversation) => (
                <ConversationItem key={conversation.id} conversation={conversation} />
              ))
            )}
          </TabsContent>

          <TabsContent value="assigned" className="mt-0">
            {conversations.assigned.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No assigned conversations</p>
              </div>
            ) : (
              conversations.assigned.map((conversation) => (
                <ConversationItem key={conversation.id} conversation={conversation} />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            {conversations.all.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No conversations</p>
              </div>
            ) : (
              conversations.all.map((conversation) => (
                <ConversationItem key={conversation.id} conversation={conversation} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

