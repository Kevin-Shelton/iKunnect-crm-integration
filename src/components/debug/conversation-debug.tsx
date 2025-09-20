'use client';

import { useConversations } from '@/hooks/use-conversations';

export function ConversationDebug() {
  const { conversations, isLoading, error } = useConversations();

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-sm mb-2">Debug: Conversations Data</h3>
      
      {isLoading && <p className="text-xs text-gray-500">Loading...</p>}
      {error && <p className="text-xs text-red-500">Error: {error}</p>}
      
      <div className="text-xs space-y-1">
        <div>Waiting: {conversations?.waiting?.length || 0}</div>
        <div>Assigned: {conversations?.assigned?.length || 0}</div>
        <div>Rejected: {conversations?.rejected?.length || 0}</div>
        <div>All: {conversations?.all?.length || 0}</div>
      </div>
      
      {conversations?.assigned && conversations.assigned.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-semibold">Assigned Conversations:</div>
          {conversations.assigned.map((conv, index) => (
            <div key={conv.id} className="text-xs bg-gray-50 p-1 mt-1 rounded">
              <div>ID: {conv.id}</div>
              <div>Name: {conv.contactName}</div>
              <div>Status: {conv.status}</div>
              <div>Agent: {conv.agentId}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
