"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/shared/api';
// Импортируем новый UserDTO
import { UserDTO } from '@/shared/api/contracts/dto';
import { userRealtimeApi } from '@/entities/user';
import LobbyWidget from '@/widgets/lobby';
import { ProfileWidget, SettingsWidget } from '@/widgets/profile';
import { useTranslation } from 'react-i18next';
import { HybridScrollView, ScrollScreen } from '@/widgets/hybrid-scrollbar';
import { LanguageSwitcher } from '@/features/language-switcher';
import AboutWidget from '@/widgets/about';

export default function DashboardScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    // 1. Меняем стейт на UserDTO
    const [user, setUser] = React.useState<UserDTO | null>(null);
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
                unsubscribeSnap = userRealtimeApi.subscribeToUser(currentUser.id, (userData) => {
                    if (userData?.isDeleted) {
                        supabase.auth.signOut().then(() => router.push('/'));
                    } else if (userData) {
                        // Предполагается, что subscribeToUser уже отдает данные, 
                        // прогнанные через наш маппер mapUserFromDB, и возвращает UserDTO
                        setUser(userData as UserDTO);
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

    // 2. Идем за гендером внутрь settings
    React.useEffect(() => {
        if (user?.settings?.gender) {
            document.documentElement.setAttribute('data-theme', user.settings.gender);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }, [user?.settings?.gender]);

    const screens = React.useMemo<ScrollScreen[]>(() => {
        if (!user) return [];
        return [
            { id: 'lobby', icon: <span title={t('nav_game')}>🎲</span>, content: <LobbyWidget user={user} />, bgClass: 'bg-theme-main' },
            { id: 'profile', icon: <span title={t('nav_profile')}>👤</span>, content: <ProfileWidget user={user} />, bgClass: 'bg-theme-main' },
            { id: 'settings', icon: <span title={t('nav_settings')}>⚙️</span>, content: <SettingsWidget user={user} languageSlot={<LanguageSwitcher />} />, bgClass: 'bg-theme-main' },
            { id: 'about', icon: <span title={t('nav_about')}>ℹ️</span>, content: <AboutWidget />, bgClass: 'bg-theme-main' }
        ];
    }, [user, t]);

    if (isLoading || !user) return <div className="h-full flex items-center justify-center font-bold">{t('loading_profile')}</div>;

    return (
        <main className="fixed inset-0 bg-theme-main flex flex-col overflow-hidden">
            <HybridScrollView screens={screens} />
            
            <div id="overlay-root" className="fixed inset-0 pointer-events-none z-[9999]" />
        </main>
    );
}