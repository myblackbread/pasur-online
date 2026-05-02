"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fbManager } from '@/lib/supabaseManager';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import LobbyView from './components/LobbyView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import { useTranslation } from 'react-i18next';

type Tab = 'lobby' | 'profile' | 'settings';

export default function MainAppPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('lobby');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribeSnap: (() => void) | undefined;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user;

            // 🟢 ВАЖНО: Очищаем старую подписку, если слушатель выстрелил дважды
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

    useEffect(() => {
        if (user?.gender) {
            document.documentElement.setAttribute('data-theme', user.gender);
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }, [user?.gender]);

    if (isLoading || !user) {
        return <div className="min-h-screen flex items-center justify-center font-bold">{t('loading_profile')}</div>;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 w-full">
                {activeTab === 'lobby' && <LobbyView user={user} />}
                {activeTab === 'profile' && <ProfileView user={user} />}
                {activeTab === 'settings' && <SettingsView user={user} />}
            </main>

            <nav className="fixed bottom-0 w-full bg-theme-panel/90 backdrop-blur-md border-t-4 border-theme-border pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-50">
                {/* 🟢 ИСПРАВЛЕНО: Теперь тут жесткая сетка из 3 колонок. Никаких сдвигов! */}
                <div className="grid grid-cols-3 h-16 max-w-md mx-auto">
                    <button onClick={() => setActiveTab('lobby')} className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'lobby' ? 'text-theme-primary scale-110' : 'opacity-50 hover:opacity-100'}`}>
                        <span className="text-xl">🎲</span>
                        <span className="text-xs font-black mt-1">{t('nav_game')}</span>
                    </button>
                    <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'profile' ? 'text-theme-primary scale-110' : 'opacity-50 hover:opacity-100'}`}>
                        <span className="text-xl">👤</span>
                        <span className="text-xs font-black mt-1">{t('nav_profile')}</span>
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center justify-center p-2 transition-all ${activeTab === 'settings' ? 'text-theme-primary scale-110' : 'opacity-50 hover:opacity-100'}`}>
                        <span className="text-xl">⚙️</span>
                        <span className="text-xs font-black mt-1">{t('nav_settings')}</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}