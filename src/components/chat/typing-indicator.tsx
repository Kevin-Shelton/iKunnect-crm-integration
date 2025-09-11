'use client';

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  contactName: string;
  isVisible: boolean;
}

export function TypingIndicator({ contactName, isVisible }: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
      <Avatar className="w-8 h-8 bg-gray-500 text-white">
        <AvatarFallback className="bg-gray-500 text-white">
          C
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col space-y-1">
        <div className="px-3 py-2 rounded-lg bg-gray-100 text-gray-900 rounded-bl-sm">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">{contactName} is typing</span>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

