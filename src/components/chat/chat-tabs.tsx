'use client';

import React from 'react';
import { X, MessageCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChatTab {
  id: string;
  contactName: string;
  lastMessage: string;
  unreadCount: number;
  isActive: boolean;
  channel: 'web' | 'sms' | 'email' | 'whatsapp';
  slaStatus: 'normal' | 'warning' | 'breach';
  timestamp: string;
}

interface ChatTabsProps {
  tabs: ChatTab[];
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  maxTabs?: number;
}

const channelIcons = {
  web: MessageCircle,
  sms: MessageCircle,
  email: MessageCircle,
  whatsapp: MessageCircle,
};

const slaColors = {
  normal: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  breach: 'bg-red-100 text-red-800',
};

export function ChatTabs({ tabs, onTabSelect, onTabClose, maxTabs = 6 }: ChatTabsProps) {
  return (
    <div className="flex border-b border-gray-200 bg-white">
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const ChannelIcon = channelIcons[tab.channel];
          
          return (
            <div
              key={tab.id}
              className={`
                flex items-center min-w-0 max-w-xs border-r border-gray-200 cursor-pointer
                ${tab.isActive 
                  ? 'bg-blue-50 border-b-2 border-b-blue-500' 
                  : 'bg-white hover:bg-gray-50'
                }
              `}
              onClick={() => onTabSelect(tab.id)}
            >
              <div className="flex items-center space-x-2 px-3 py-2 min-w-0 flex-1">
                {/* Channel Icon */}
                <div className="flex-shrink-0">
                  <ChannelIcon className="w-4 h-4 text-gray-500" />
                </div>

                {/* Contact Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {tab.contactName}
                    </span>
                    
                    {/* Unread Badge */}
                    {tab.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                        {tab.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-0.5">
                    {/* Last Message Preview */}
                    <span className="text-xs text-gray-500 truncate">
                      {tab.lastMessage}
                    </span>
                    
                    {/* SLA Status */}
                    {tab.slaStatus !== 'normal' && (
                      <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs ${slaColors[tab.slaStatus]}`}>
                        {tab.slaStatus === 'warning' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span className="text-xs">
                          {tab.slaStatus === 'warning' ? 'Warning' : 'Breach'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 w-6 h-6 p-0 hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Limit Indicator */}
      {tabs.length >= maxTabs && (
        <div className="flex items-center px-3 py-2 bg-gray-50 border-l border-gray-200">
          <span className="text-xs text-gray-500">
            Max {maxTabs} tabs
          </span>
        </div>
      )}
    </div>
  );
}

