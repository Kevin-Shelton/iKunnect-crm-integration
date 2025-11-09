
'use client';

import React, { useEffect } from 'react';
import { DraggableMultiChat } from '@/components/chat/draggable-multi-chat';

export default function AgentDeskPage() {
  useEffect(() => {
    const handleClaimChat = (event: any) => {
      const { conversationId, contactName, contactId, contactEmail, contactPhone } = event.detail;
      if (conversationId && contactName && contactId) {
        if ((window as any).draggableMultiChat) {
          (window as any).draggableMultiChat.addChat(conversationId, contactName, contactId, contactEmail, contactPhone);
        }
      }
    };

    window.addEventListener('claimChat', handleClaimChat);

    return () => {
      window.removeEventListener('claimChat', handleClaimChat);
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-100">
      <DraggableMultiChat />
    </div>
  );
}
