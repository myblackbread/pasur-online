"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fbManager } from '@/lib/supabaseManager';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import LobbyView from './components/LobbyView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import { useTranslation } from 'react-i18next';

// 🟢 Подключаем наш новый скроллбар
import { HybridScrollView, ScrollScreen } from '@/app/ui/hybrid-scrollbar';

export default function MainAppPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnap: (() => void) | undefined;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user;

            // Очищаем старую подписку
            if (unsubscribeSnap) {
                unsubscribeSnap();
                unsubscribeSnap = undefined;
            }

            if (currentUser) {
                unsubscribeSnap = fbManager.subscribeToUser(currentUser.id, (userData) => {
                    if (userData?.isDeleted) {
                        supabase.auth.signOut().then(() => router.push('/'));
                    } else if (userData) {
                        setUser(userData);
                        setIsLoading(false);
                    }
                });
            } else {
                router.push('/');
            }
        });

        // Первичная проверка сессии
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) router.push('/');
        });

        return () => {
            subscription.unsubscribe();
            if (unsubscribeSnap) unsubscribeSnap();
        };
    }, [router]);

    // Установка темы (цветов)
    useEffect(() => {
        if (user?.gender) {
            document.documentElement.setAttribute('data-theme', user.gender);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }, [user?.gender]);

    // 🟢 Формируем экраны для HybridScrollView через useMemo (чтобы не пересоздавать массив при ререндерах)
    const screens = useMemo<ScrollScreen[]>(() => {
        if (!user) return [];
        
        return [
            {
                id: 'lobby',
                icon: <span title={t('nav_game')}>🎲</span>,
                content: <LobbyView user={user} />,
                bgClass: 'bg-theme-main' // Используем системные цвета темы
            },
            {
                id: 'profile',
                icon: <span title={t('nav_profile')}>👤</span>,
                content: <ProfileView user={user} />,
                bgClass: 'bg-theme-main'
            },
            {
                id: 'settings',
                icon: <span title={t('nav_settings')}>⚙️</span>,
                content: <SettingsView user={user} />,
                bgClass: 'bg-theme-main'
            }
        ];
    }, [user, t]);

    if (isLoading || !user) {
        return <div className="min-h-screen flex items-center justify-center font-bold">{t('loading_profile')}</div>;
    }

    return (
        // 🟢 Обертка на весь экран без отступов под старый нижний таб-бар
        <main className="w-full h-[100dvh] bg-theme-main overflow-hidden">
            <HybridScrollView screens={screens} />
        </main>
    );
}