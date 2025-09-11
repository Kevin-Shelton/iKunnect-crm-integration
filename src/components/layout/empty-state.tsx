import React from 'react';
import { MessageCircle, Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  type: 'no_conversations' | 'mcp_error' | 'loading' | 'connection_error';
  title?: string;
  message?: string;
  error?: string;
  onRetry?: () => void;
}

export function EmptyState({ type, title, message, error, onRetry }: EmptyStateProps) {
  const getEmptyStateContent = () => {
    switch (type) {
      case 'no_conversations':
        return {
          icon: <MessageCircle className="h-12 w-12 text-gray-400" />,
          title: title || 'No Conversations',
          message: message || 'No conversations available in this queue. New conversations will appear here when customers initiate chat.',
          showRetry: true
        };
      
      case 'mcp_error':
        return {
          icon: <WifiOff className="h-12 w-12 text-red-400" />,
          title: title || 'MCP Connection Error',
          message: message || 'Unable to connect to the MCP server. Please check your configuration.',
          showRetry: true,
          isError: true
        };
      
      case 'connection_error':
        return {
          icon: <AlertCircle className="h-12 w-12 text-orange-400" />,
          title: title || 'Connection Issue',
          message: message || 'There was a problem connecting to the conversation service.',
          showRetry: true,
          isError: true
        };
      
      case 'loading':
        return {
          icon: <RefreshCw className="h-12 w-12 text-blue-400 animate-spin" />,
          title: title || 'Loading Conversations',
          message: message || 'Connecting to MCP server and fetching conversations...',
          showRetry: false
        };
      
      default:
        return {
          icon: <MessageCircle className="h-12 w-12 text-gray-400" />,
          title: 'No Data',
          message: 'No information available.',
          showRetry: false
        };
    }
  };

  const content = getEmptyStateContent();

  return (
    <Card className="m-4">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="mb-4">
          {content.icon}
        </div>
        
        <h3 className={`text-lg font-semibold mb-2 ${content.isError ? 'text-red-600' : 'text-gray-900'}`}>
          {content.title}
        </h3>
        
        <p className="text-gray-600 mb-4 max-w-md">
          {content.message}
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 max-w-md">
            <p className="text-sm text-red-700 font-mono">
              {error}
            </p>
          </div>
        )}
        
        {content.showRetry && onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        )}
        
        {type === 'no_conversations' && (
          <div className="mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-4 w-4 text-green-500" />
              <span>MCP Connected</span>
            </div>
            <p>Waiting for new customer conversations...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

