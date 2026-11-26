'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Spade, Trophy, MessageSquare, User, RefreshCw } from 'lucide-react';
import { HybridScrollView, type ScrollScreen } from '@/app/hybrid-scrollbar';
import { chatService } from '@/services/chatService';
import { authService, type AuthSession } from '@/services/authService';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { LobbyHub } from '@/components/hubs/LobbyHub';
import { MatchesHub } from '@/components/hubs/MatchesHub';
import { ChatsHub } from '@/components/hubs/ChatsHub';
import { ProfileHub } from '@/components/hubs/ProfileHub';

export default function PwaAppPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const initSession = useCallback(async () => {
    setIsInitializing(true);
    try {
      const user = await authService.getCurrentUser();
      setSession(user);

      if (user) {
        // Инициализируем локальные крипто-ключи через серверный контракт
        const res = await chatService.initDevice(user.token);
        setIdentityId(res.identityId);
      }
    } catch (err) {
      console.error('[Init Failed]:', err);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  if (isInitializing) {
    return (
      <main className="w-full h-dvh bg-bg flex items-center justify-center text-muted">
        <RefreshCw size={24} className="animate-spin opacity-50" />
      </main>
    );
  }

  // Если сессия не авторизована — показываем регистрацию/вход
  if (!session) {
    return <AuthScreen onSuccess={initSession} />;
  }

  const screens: ScrollScreen[] = [
    {
      id: 'lobby',
      title: 'Столы',
      icon: <Spade size={18} />,
      content: <LobbyHub />,
    },
    {
      id: 'matches',
      title: 'Матчи',
      icon: <Trophy size={18} />,
      content: <MatchesHub />,
    },
    {
      id: 'chats',
      title: 'Чат',
      icon: <MessageSquare size={18} />,
      content: identityId ? (
        <ChatsHub identityId={identityId} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted">
          Генерация ключей...
        </div>
      ),
    },
    {
      id: 'profile',
      title: 'Профиль',
      icon: <User size={18} />,
      content: <ProfileHub onLogout={initSession} />,
    },
  ];

  return (
    <main className="w-full h-dvh overflow-hidden font-sans bg-bg select-none flex flex-col relative">
      <div className="flex-1 w-full min-h-0 overflow-hidden relative">
        <HybridScrollView screens={screens} initialHubId="lobby" />
      </div>
    </main>
  );
}