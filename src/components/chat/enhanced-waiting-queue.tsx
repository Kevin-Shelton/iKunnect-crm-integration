'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  User, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  SkipForward,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WaitingChat {
  id: string;
  contactName: string;
  lastMessageBody: string;
  lastMessageDate: string;
  unreadCount: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  waitTime: string;
  estimatedCustomerName?: string;
}

interface EnhancedWaitingQueueProps {
  conversations: WaitingChat[];
  onClaim: (conversationId: string) => void;
  onPass: (conversationId: string) => void;
  onReject: (conversationId: string) => void;
  maxVisible?: number;
  isLoading?: boolean;
}

export function EnhancedWaitingQueue({ 
  conversations, 
  onClaim, 
  onPass, 
  onReject, 
  maxVisible = 5,
  isLoading = false 
}: EnhancedWaitingQueueProps) {
  const [showAll, setShowAll] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Extract customer name from message content or use fallback
  const getDisplayName = (chat: WaitingChat): string => {
    // Try to extract name from message content
    const message = chat.lastMessageBody.toLowerCase();
    
    // Common patterns for names in messages
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

    // If we have an estimated name, use it
    if (chat.estimatedCustomerName) {
      return chat.estimatedCustomerName;
    }

    // Fallback to a more meaningful name than "Customer 1234"
    const timeBasedId = new Date(chat.lastMessageDate).getTime().toString().slice(-4);
    return `Visitor ${timeBasedId}`;
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

  const handleAction = async (action: 'claim' | 'pass' | 'reject', conversationId: string) => {
    setActionLoading(conversationId);
    try {
      switch (action) {
        case 'claim':
          await onClaim(conversationId);
          break;
        case 'pass':
          await onPass(conversationId);
          break;
        case 'reject':
          await onReject(conversationId);
          break;
      }
    } finally {
      setActionLoading(null);
    }
  };

  const visibleChats = showAll ? conversations : conversations.slice(0, maxVisible);
  const hiddenCount = Math.max(0, conversations.length - maxVisible);

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 text-lg mb-2">✨</div>
        <div className="text-gray-500 text-sm">No waiting conversations</div>
        <div className="text-gray-400 text-xs mt-1">
          New customer chats will appear here
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Waiting Queue ({conversations.length})
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

      {/* Waiting Chats */}
      <div className="space-y-2 px-2">
        {visibleChats.map((chat) => {
          const displayName = getDisplayName(chat);
          const isLoading = actionLoading === chat.id;
          
          return (
            <div
              key={chat.id}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              {/* Chat Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-yellow-100 text-yellow-700">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 truncate">
                        {displayName}
                      </span>
                      {chat.priority !== 'normal' && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1.5 py-0.5 ${getPriorityColor(chat.priority)}`}
                        >
                          {chat.priority}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>Waiting {formatDistanceToNow(new Date(chat.lastMessageDate), { addSuffix: true })}</span>
                      {chat.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
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
                  onClick={() => handleAction('pass', chat.id)}
                  disabled={isLoading}
                  className="flex-1 text-xs h-8"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                  ) : (
                    <>
                      <SkipForward className="w-3 h-3 mr-1" />
                      Pass
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  onClick={() => handleAction('claim', chat.id)}
                  disabled={isLoading}
                  className="flex-1 text-xs h-8"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Claim
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction('reject', chat.id)}
                  disabled={isLoading}
                  className="flex-1 text-xs h-8"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Queue Status */}
      <div className="px-4 py-2 bg-gray-50 border-t">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Showing: {visibleChats.length}</span>
            <span>Total: {conversations.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>Smart Queue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
