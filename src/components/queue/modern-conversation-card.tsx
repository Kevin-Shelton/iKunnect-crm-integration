'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Conversation } from '@/lib/types';
import { getLanguageFlag, getSentimentEmoji, getSentimentColor } from '@/lib/language-utils';

interface ModernConversationCardProps {
  conversation: Conversation;
  isSelected: boolean;
  activeTab: string;
  onSelect: () => void;
  onClaim?: () => void;
  onPass?: () => void;
  onReject?: () => void;
}

export function ModernConversationCard({
  conversation,
  isSelected,
  activeTab,
  onSelect,
  onClaim,
  onPass,
  onReject,
}: ModernConversationCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Get customer initials for avatar
  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format time
  const formatTime = () => {
    try {
      const dateValue = conversation.lastMessageDate;
      if (!dateValue) return 'No messages';
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      // Show more precise time
      const distance = formatDistanceToNow(date, { addSuffix: false });
      return distance.replace('about ', '').replace('less than a minute', '< 1 min').replace(' minutes', 'min').replace(' hours', 'h').replace(' hour', 'h');
    } catch (error) {
      return 'Unknown';
    }
  };

  // Get wait time color
  const getWaitTimeColor = () => {
    try {
      const date = new Date(conversation.lastMessageDate || '');
      const minutesAgo = (Date.now() - date.getTime()) / 1000 / 60;
      
      if (minutesAgo > 5) return 'text-red-600 font-semibold';
      if (minutesAgo > 2) return 'text-orange-600 font-medium';
      return 'text-gray-500';
    } catch {
      return 'text-gray-500';
    }
  };

  return (
    <div
      className={`
        group relative px-4 py-4 cursor-pointer transition-all duration-150
        ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500 pl-[14px]' : 'border-l-4 border-l-transparent'}
        ${isHovered && !isSelected ? 'bg-gray-50' : ''}
        hover:bg-gray-50
      `}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main content */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {getInitials(conversation.contactName)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {conversation.contactName}
              </h3>
              
              {/* Language flag - inline */}
              {conversation.customerLanguage && conversation.customerLanguage !== 'en' && (
                <span className="text-base flex-shrink-0" title={conversation.customerLanguage}>
                  {getLanguageFlag(conversation.customerLanguage)}
                </span>
              )}
              
              {/* Sentiment emoji - inline */}
              {conversation.sentiment && (
                <span className={`text-base flex-shrink-0 ${getSentimentColor(conversation.sentiment)}`} title={conversation.sentiment}>
                  {getSentimentEmoji(conversation.sentiment)}
                </span>
              )}
            </div>

            {/* Time and menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs ${getWaitTimeColor()}`}>
                {formatTime()}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
              </Button>
            </div>
          </div>

          {/* Contact info */}
          {(conversation.email || conversation.phone) && (
            <p className="text-xs text-gray-500 mb-2 truncate">
              {conversation.email || conversation.phone}
            </p>
          )}

          {/* Message preview */}
          <p className="text-[13px] text-gray-600 line-clamp-2 leading-relaxed mb-3">
            {conversation.lastMessageBody || 'No message'}
          </p>

          {/* Actions - show on hover or if selected */}
          {activeTab === 'waiting' && (isHovered || isSelected) && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onClaim?.();
                }}
              >
                Claim
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-medium text-gray-700 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onPass?.();
                }}
              >
                Pass
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-medium text-red-600 hover:bg-red-50 border-red-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject?.();
                }}
              >
                Reject
              </Button>
            </div>
          )}

          {/* Assigned info */}
          {conversation.assignedTo && (
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <User className="h-3 w-3 mr-1" />
              Assigned to {conversation.assignedTo}
            </div>
          )}

          {/* Unread count badge - floating */}
          {(conversation.unreadCount ?? 0) > 0 && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 font-medium shadow-sm">
                {conversation.unreadCount}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
