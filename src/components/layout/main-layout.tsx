'use client';

import { ReactNode } from 'react';
import { Header } from './header';
import { Toaster } from '@/components/ui/sonner';

interface MainLayoutProps {
  children: ReactNode;
  agentName?: string;
  agentStatus?: 'available' | 'busy' | 'away' | 'offline';
  queueStats?: {
    waiting: number;
    assigned: number;
    total: number;
  };
  onStatusChange?: (status: 'available' | 'busy' | 'away' | 'offline') => void;
  onSearch?: (query: string) => void;
}

export function MainLayout({
  children,
  agentName,
  agentStatus,
  queueStats,
  onStatusChange,
  onSearch
}: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header
        agentName={agentName}
        agentStatus={agentStatus}
        queueStats={queueStats}
        onStatusChange={onStatusChange}
        onSearch={onSearch}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            color: '#374151',
          },
        }}
      />
    </div>
  );
}

