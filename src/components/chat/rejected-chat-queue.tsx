'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  XCircle, 
  User, 
  MessageSquare, 
  RotateCcw,
  Trash2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RejectedChat {
  id: string;
  contactName: string;
  lastMessageBody: string;
  lastMessageDate: string;
  rejectedAt: string;
  rejectedBy: string;
  rejectionReason: string;
  originalPriority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  messageCount: number;
}

interface RejectedChatQueueProps {
  conversations: RejectedChat[];
  onRestore: (conversationId: string) => void;
  onPermanentDelete: (conversationId: string) => void;
  onView: (conversationId: string) => void;
  maxVisible?: number;
  isLoading?: boolean;
}

export function RejectedChatQueue({ 
  conversations, 
  onRestore, 
  onPermanentDelete,
  onView,
  maxVisible = 10,
  isLoading = false 
}: RejectedChatQueueProps) {
  const [showAll, setShowAll] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedChat, setExpandedChat] = useState<string | null>(null);

  const handleAction = async (action: 'restore' | 'delete' | 'view', conversationId: string) => {
    setActionLoading(conversationId);
    try {
      switch (action) {
        case 'restore':
          await onRestore(conversationId);
          break;
        case 'delete':
          if (confirm('Are you sure you want to permanently delete this conversation? This action cannot be undone.')) {
            await onPermanentDelete(conversationId);
          }
          break;
        case 'view':
          await onView(conversationId);
          break;
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDisplayName = (chat: RejectedChat): string => {
    // First, check if we have a contact name from the pre-chat form
    if (chat.contactName && chat.contactName.trim() && !chat.contactName.startsWith('Customer ')) {
      return chat.contactName.trim();
    }
    
    // Use the same name extraction logic as the waiting queue
    const message = chat.lastMessageBody.toLowerCase();
    
    const namePatterns = [
      /my name is ([a-zA-Z\s]+)/i,
      /i'm ([a-zA-Z\s]+)/i,
      /this is ([a-zA-Z\s]+)/i,
      /^([a-zA-Z\s]+) here/i,
      /^hi,?\s*i'm\s+([a-zA-Z\s]+)/i,
      /^hello,?\s*my name is\s+([a-zA-Z\s]+)/i
    ];

    for (const pattern of namePatterns) {
      const match = chat.lastMessageBody.match(pattern);
      if (match && match[1]) {
        const extractedName = match[1].trim();
        if (extractedName.length > 1 && extractedName.length < 30) {
          return extractedName;
        }
      }
    }

    // Last resort: use visitor ID
    const timeBasedId = new Date(chat.lastMessageDate).getTime().toString().slice(-4);
    return `Visitor ${timeBasedId}`;
  };

  const visibleChats = showAll ? conversations : conversations.slice(0, maxVisible);
  const hiddenCount = Math.max(0, conversations.length - maxVisible);

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 text-lg mb-2">🗑️</div>
        <div className="text-gray-500 text-sm">No rejected conversations</div>
        <div className="text-gray-400 text-xs mt-1">
          Rejected chats will appear here for review
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-red-50 border-b border-red-200">
        <div className="flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm font-medium text-red-700">
            Rejected Queue ({conversations.length})
          </span>
        </div>
        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                +{hiddenCount} More
              </>
            )}
          </Button>
        )}
      </div>

      {/* Rejected Chats */}
      <div className="space-y-2 px-2">
        {visibleChats.map((chat) => {
          const displayName = getDisplayName(chat);
          const isLoading = actionLoading === chat.id;
          const isExpanded = expandedChat === chat.id;
          
          return (
            <div
              key={chat.id}
              className="bg-red-50 border border-red-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              {/* Chat Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-red-100 text-red-700">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 truncate">
                        {displayName}
                      </span>
                      <Badge 
                        variant="outline" 
                        className="text-xs px-1.5 py-0.5 bg-red-100 text-red-800 border-red-300"
                      >
                        Rejected
                      </Badge>
                      {chat.originalPriority !== 'normal' && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1.5 py-0.5 ${getPriorityColor(chat.originalPriority)}`}
                        >
                          {chat.originalPriority}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>Rejected {formatDistanceToNow(new Date(chat.rejectedAt), { addSuffix: true })}</span>
                      <span>by {chat.rejectedBy}</span>
                      <span>• {chat.messageCount} messages</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedChat(isExpanded ? null : chat.id)}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>

              {/* Last Message Preview */}
              <div className="mb-3">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {chat.lastMessageBody}
                  </p>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mb-3 p-3 bg-white rounded border border-red-200">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="font-medium text-red-700">Rejection Reason:</span>
                    </div>
                    <p className="text-gray-700 italic pl-5">"{chat.rejectionReason}"</p>
                    
                    <div className="flex items-center space-x-4 pt-2 border-t border-red-100">
                      <span><strong>Original Priority:</strong> {chat.originalPriority}</span>
                      <span><strong>Last Activity:</strong> {formatDistanceToNow(new Date(chat.lastMessageDate), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              {chat.tags && chat.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {chat.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                      {tag}
                    </Badge>
                  ))}
                  {chat.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      +{chat.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction('view', chat.id)}
                  disabled={isLoading}
                  className="flex-1 text-xs h-8"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                  ) : (
                    <>
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  onClick={() => handleAction('restore', chat.id)}
                  disabled={isLoading}
                  className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restore
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction('delete', chat.id)}
                  disabled={isLoading}
                  className="flex-1 text-xs h-8"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Queue Status */}
      <div className="px-4 py-2 bg-red-50 border-t border-red-200">
        <div className="flex items-center justify-between text-xs text-red-600">
          <div className="flex items-center space-x-4">
            <span>Showing: {visibleChats.length}</span>
            <span>Total Rejected: {conversations.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Rejected Queue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
