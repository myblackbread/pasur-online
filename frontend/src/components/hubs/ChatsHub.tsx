'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ChatHub } from '@/components/chat/ChatHub';

export const ChatsHub: React.FC<{ identityId: string }> = ({ identityId }) => {
  return (
    <div
      className="relative min-h-full w-full bg-bg text-text flex flex-col select-none"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5px)',
      }}
    >
      <ChatHub
        myIdentityId={identityId}
        targetUserId="00000000-0000-0000-0000-000000000002"
        targetName="Игрок 2"
      />
    </div>
  );
};