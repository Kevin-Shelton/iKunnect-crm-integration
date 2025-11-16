'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Conversation } from '@/lib/types';
import { getLanguageFlag, getSentimentEmoji } from '@/lib/language-utils';

interface TailwindConversationCardProps {
  conversation: Conversation;
  isSelected: boolean;
  activeTab: string;
  onSelect: () => void;
  onClaim?: () => void;
  onPass?: () => void;
  onReject?: () => void;
}

export function TailwindConversationCard({
  conversation,
  isSelected,
  activeTab,
  onSelect,
  onClaim,
  onPass,
  onReject,
}: TailwindConversationCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Get customer initials for avatar
  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
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
      
      const distance = formatDistanceToNow(date, { addSuffix: false });
      return distance
        .replace('about ', '')
        .replace('less than a minute', '< 1min')
        .replace(' minutes', 'min')
        .replace(' minute', 'min')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd');
    } catch (error) {
      return 'Unknown';
    }
  };

  // Get wait time styling
  const getWaitTimeStyle = () => {
    try {
      const date = new Date(conversation.lastMessageDate || '');
      const minutesAgo = (Date.now() - date.getTime()) / 1000 / 60;
      
      if (minutesAgo > 5) return 'text-red-600 font-semibold';
      if (minutesAgo > 2) return 'text-amber-600 font-medium';
      return 'text-gray-500 font-normal';
    } catch {
      return 'text-gray-500 font-normal';
    }
  };

  return (
    <div
      className={`
        relative px-4 py-4 cursor-pointer transition-all duration-200
        bg-white
        ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' : ''}
        ${isHovered && !isSelected ? 'shadow-md bg-gray-50' : 'shadow-sm'}
        rounded-lg
        mb-2 mx-2
      `}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main content */}
      <div className="flex items-start gap-3">
        {/* Avatar with gradient */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {getInitials(conversation.contactName)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name row with inline indicators */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {conversation.contactName}
              </h3>
              
              {/* Language flag - inline, larger */}
              {conversation.customerLanguage && conversation.customerLanguage !== 'en' && (
                <span className="text-base flex-shrink-0" title={`Language: ${conversation.customerLanguage}`}>
                  {getLanguageFlag(conversation.customerLanguage)}
                </span>
              )}
              
              {/* Sentiment emoji - inline, larger */}
              {conversation.sentiment && (
                <span 
                  className={`text-base flex-shrink-0 ${
                    conversation.sentiment === 'positive' ? '' :
                    conversation.sentiment === 'negative' ? '' :
                    conversation.sentiment === 'mixed' ? '' : ''
                  }`} 
                  title={`Sentiment: ${conversation.sentiment}`}
                >
                  {getSentimentEmoji(conversation.sentiment)}
                </span>
              )}
            </div>

            {/* Time with color coding */}
            <span className={`text-xs flex-shrink-0 ${getWaitTimeStyle()}`}>
              {formatTime()}
            </span>
          </div>

          {/* Contact info */}
          {(conversation.email || conversation.phone) && (
            <p className="text-xs text-gray-500 mb-2 truncate">
              {conversation.email || conversation.phone}
            </p>
          )}

          {/* Message preview with better spacing */}
          <p className="text-[13px] text-gray-600 line-clamp-2 leading-relaxed mb-3">
            {conversation.lastMessageBody || 'No message'}
          </p>

          {/* Actions - show on hover for waiting queue */}
          {activeTab === 'waiting' && (isHovered || isSelected) && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
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
                className="h-8 px-3 text-xs font-medium text-gray-700 hover:bg-gray-100 border-gray-300 transition-all"
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
                className="h-8 px-3 text-xs font-medium text-red-600 hover:bg-red-50 border-red-300 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject?.();
                }}
              >
                Reject
              </Button>
            </div>
          )}

          {/* Assigned info for assigned tab */}
          {activeTab === 'assigned' && conversation.assignedTo && (
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Assigned to {conversation.assignedTo}
            </div>
          )}
        </div>
      </div>

      {/* Unread count badge - floating top-right */}
      {(conversation.unreadCount ?? 0) > 0 && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 font-medium shadow-sm">
            {conversation.unreadCount}
          </Badge>
        </div>
      )}
    </div>
  );
}
