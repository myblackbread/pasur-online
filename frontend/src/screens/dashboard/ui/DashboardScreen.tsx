"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { realtimeApi, supabase } from '@/shared/api/supabase';
import { UserProfile } from '@/entities/user/model/user.types';
import LobbyWidget from '@/widgets/lobby/ui/LobbyWidget';
import ProfileWidget from '@/widgets/profile/ui/ProfileWidget';
import SettingsWidget from '@/widgets/profile/ui/SettingsWidget';
import { useTranslation } from 'react-i18next';
import { HybridScrollView, ScrollScreen } from '@/widgets/hybrid-scrollbar';
import AboutWidget from '@/widgets/about/ui/AboutWidget';

export default function DashboardScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const [user, setUser] = React.useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
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

    React.useEffect(() => {
        if (user?.gender) document.documentElement.setAttribute('data-theme', user.gender);
        else document.documentElement.removeAttribute('data-theme');
    }, [user?.gender]);

    const screens = React.useMemo<ScrollScreen[]>(() => {
        if (!user) return [];
        return [
            { id: 'lobby', icon: <span title={t('nav_game')}>🎲</span>, content: <LobbyWidget user={user} />, bgClass: 'bg-theme-main' },
            { id: 'profile', icon: <span title={t('nav_profile')}>👤</span>, content: <ProfileWidget user={user} />, bgClass: 'bg-theme-main' },
            { id: 'settings', icon: <span title={t('nav_settings')}>⚙️</span>, content: <SettingsWidget user={user} />, bgClass: 'bg-theme-main' },
            { id: 'about', icon: <span title={t('nav_about')}>ℹ️</span>, content: <AboutWidget />, bgClass: 'bg-theme-main' } // <--- НОВЫЙ ТАБ
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