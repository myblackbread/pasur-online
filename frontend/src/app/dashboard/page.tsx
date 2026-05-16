"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { realtimeApi, supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import LobbyView from '@/features/lobby/components/LobbyView';
import ProfileView from '@/features/profile/components/ProfileView';
import SettingsView from '@/features/profile/components/SettingsView';
import { useTranslation } from 'react-i18next';
import { HybridScrollView, ScrollScreen } from '@/components/ui/hybrid-scrollbar';

export default function MainAppPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnap: (() => void) | undefined;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user;
            if (unsubscribeSnap) {
                unsubscribeSnap();
                unsubscribeSnap = undefined;
            }
            if (currentUser) {
                unsubscribeSnap = realtimeApi.subscribeToUser(currentUser.id, (userData) => {
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

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) router.push('/');
        });

        return () => {
            subscription.unsubscribe();
            if (unsubscribeSnap) unsubscribeSnap();
        };
    }, [router]);

    useEffect(() => {
        if (user?.gender) document.documentElement.setAttribute('data-theme', user.gender);
        else document.documentElement.removeAttribute('data-theme');
    }, [user?.gender]);

    const screens = useMemo<ScrollScreen[]>(() => {
        if (!user) return [];
        return [
            { id: 'lobby', icon: <span title={t('nav_game')}>🎲</span>, content: <LobbyView user={user} />, bgClass: 'bg-theme-main' },
            { id: 'profile', icon: <span title={t('nav_profile')}>👤</span>, content: <ProfileView user={user} />, bgClass: 'bg-theme-main' },
            { id: 'settings', icon: <span title={t('nav_settings')}>⚙️</span>, content: <SettingsView user={user} />, bgClass: 'bg-theme-main' }
        ];
    }, [user, t]);

    if (isLoading || !user) return <div className="h-full flex items-center justify-center font-bold">{t('loading_profile')}</div>;

    return (
        <main className="fixed inset-0 bg-theme-main flex flex-col overflow-hidden">
            <HybridScrollView screens={screens} />
            
            {/* Глобальная точка для всех модалок и летящих элементов */}
            <div id="overlay-root" className="fixed inset-0 pointer-events-none z-[9999]" />
        </main>
    );
}