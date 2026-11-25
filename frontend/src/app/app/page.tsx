'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, User, RefreshCw } from 'lucide-react';
import { HybridScrollView, type ScrollScreen } from "@/app/hybrid-scrollbar";
import { chatService } from '@/services/chatService';
import { ChatHub } from '@/components/chat/ChatHub';

export default function PwaAppPage() {
    const [identityId, setIdentityId] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    const DEMO_TOKEN = 'demo_jwt_token';
    const DEMO_TARGET_USER_ID = '00000000-0000-0000-0000-000000000002';

    useEffect(() => {
        chatService
            .initDevice(DEMO_TOKEN)
            .then((res) => {
                setIdentityId(res.identityId);
            })
            .catch((err) => {
                console.error('[Init Device Failed]:', err);
            })
            .finally(() => {
                setIsInitializing(false);
            });
    }, []);

    if (isInitializing) {
        return (
            <main className="w-full h-dvh bg-bg flex items-center justify-center text-subtle">
                <RefreshCw size={24} className="animate-spin opacity-50" />
            </main>
        );
    }

    const screens: ScrollScreen[] = [
        {
            id: 'chats',
            title: 'Чат',
            icon: <MessageSquare size={18} />,
            content: identityId ? (
                <ChatHub
                    myIdentityId={identityId}
                    targetUserId={DEMO_TARGET_USER_ID}
                    targetName="Игрок 2"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                    Ошибка инициализации ключей
                </div>
            ),
        },
        {
            id: 'profile',
            title: 'Профиль',
            icon: <User size={18} />,
            content: (
                <div className="w-full h-full p-4 flex flex-col gap-2 text-text text-xs">
                    <h3 className="font-bold text-sm">Крипто-профиль устройства</h3>
                    <p className="text-muted break-all">Identity ID: {identityId || '—'}</p>
                </div>
            ),
        },
    ];

    return (
        <main className="w-full h-dvh overflow-hidden font-sans bg-bg select-none flex flex-col relative">
            <div
                className="sticky top-0 z-50 w-full bg-bg shrink-0 pointer-events-none"
                style={{
                    height: 'calc(env(safe-area-inset-top, 0px) + 5px)',
                }}
            />

            <div className="flex-1 w-full min-h-0 overflow-hidden relative">
                <HybridScrollView screens={screens} initialHubId="chats" />
            </div>
        </main>
    );
}