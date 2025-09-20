'use client';

import { ConversationQueue } from '@/lib/types';

interface SidebarDebugProps {
  conversations: ConversationQueue;
  activeTab: string;
}

export function SidebarDebug({ conversations, activeTab }: SidebarDebugProps) {
  return (
    <div className="bg-yellow-100 border border-yellow-300 p-2 m-2 rounded text-xs">
      <div className="font-bold">Sidebar Debug</div>
      <div>Active Tab: {activeTab}</div>
      <div>Conversations prop:</div>
      <div className="ml-2">
        <div>waiting: {conversations?.waiting?.length || 0}</div>
        <div>assigned: {conversations?.assigned?.length || 0}</div>
        <div>rejected: {conversations?.rejected?.length || 0}</div>
        <div>all: {conversations?.all?.length || 0}</div>
      </div>
      {conversations?.assigned && conversations.assigned.length > 0 && (
        <div className="mt-1">
          <div className="font-semibold">Assigned Details:</div>
          {conversations.assigned.map((conv, i) => (
            <div key={i} className="ml-2 text-xs">
              {conv.id} - {conv.contactName} - {conv.status}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
