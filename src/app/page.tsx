'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';

export default function Home() {
  const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'away' | 'offline'>('available');

  const handleStatusChange = (status: 'available' | 'busy' | 'away' | 'offline') => {
    setAgentStatus(status);
  };

  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header 
        agentStatus={agentStatus}
        onStatusChange={handleStatusChange}
        onSearch={handleSearch}
      />
      
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-6">💬</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Agent Chat Desk
          </h1>
          <p className="text-gray-600 mb-6">
            Your n8n to Agent Desk integration is ready! The chat system will receive conversations from your GoHighLevel workflows.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-green-600 mr-2">✅</div>
              <div className="text-green-800 font-medium">Integration Active</div>
            </div>
            <div className="text-green-700 text-sm mt-1">
              Ready to receive messages from n8n workflows
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <div className="mb-2">
              <strong>API Endpoint:</strong> /api/chat-events
            </div>
            <div className="mb-2">
              <strong>HMAC Secret:</strong> your_shared_hmac_secret_here_change_this_in_production
            </div>
            <div>
              <strong>Status:</strong> <span className="text-green-600">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

