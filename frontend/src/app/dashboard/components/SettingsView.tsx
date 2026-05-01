import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { fbManager } from '@/lib/supabaseManager';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function SettingsView({ user }: { user: UserProfile }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [sbUser, setSbUser] = useState<User | null>(null);
    const [isLinking, setIsLinking] = useState(false);
    
    const [isIncognito, setIsIncognito] = useState(user.settings?.isIncognito || false);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setSbUser(user);
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        if (confirm(t('logout_confirm'))) {
            await supabase.auth.signOut();
            localStorage.removeItem('pasurUid');
            router.push('/');
        }
    };

    const handleLinkGoogle = async () => {
        setIsLinking(true);
        try {
            await fbManager.linkGoogleAccount();
            alert(t('settings_google_linked'));
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLinking(false);
        }
    };

    const toggleIncognito = async () => {
        const newValue = !isIncognito;
        setIsIncognito(newValue);
        try {
            const newSettings = { ...user.settings, isIncognito: newValue };
            await supabase.from('users').update({ settings: newSettings }).eq('id', user.uid);
        } catch (error) {
            console.error("Ошибка обновления настроек приватности", error);
            setIsIncognito(!newValue); 
            alert(t('settings_update_error'));
        }
    };

    const hasGoogleLinked = sbUser?.app_metadata?.providers?.includes('google');

    return (
        <div className="p-6 max-w-md mx-auto">
            <h1 className="text-3xl font-black mb-6">{t('settings_title')}</h1>

            {sbUser && !hasGoogleLinked && (
                <div className="bg-amber-100 dark:bg-amber-900/40 rounded-3xl border-4 border-amber-500 p-5 mb-6 shadow-md">
                    <h3 className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-2 text-lg">
                        <span>⚠️</span> {t('settings_save_progress')}
                    </h3>
                    <p className="text-sm opacity-80 mb-4 font-medium text-amber-900 dark:text-amber-100">
                        {t('settings_guest_warning')} {user.balance} 💰 {t('settings_guest_warning_end')}
                    </p>
                    <button 
                        onClick={handleLinkGoogle}
                        disabled={isLinking}
                        className="w-full bg-amber-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-600 transition disabled:opacity-50"
                    >
                        {isLinking ? t('settings_linking') : `🌐 ${t('settings_link_google')}`}
                    </button>
                </div>
            )}

            <div className="bg-theme-panel rounded-3xl border-4 border-theme-border overflow-hidden mb-6 shadow-sm">
                <LanguageSwitcher />
                <div className="p-5 flex justify-between items-center border-b-4 border-theme-border bg-theme-main">
                    <div>
                        <div className="font-bold flex items-center gap-2">
                            <span>🕵️</span> {t('settings_incognito')}
                        </div>
                        <div className="text-xs opacity-60 mt-1 max-w-[200px] font-medium">
                            {t('settings_incognito_desc')}
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" className="sr-only peer" checked={isIncognito} onChange={toggleIncognito} />
                        <div className="w-14 h-8 bg-theme-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-theme-primary"></div>
                    </label>
                </div>

                <div className="p-5 flex justify-between items-center border-b-4 border-theme-border">
                    <span className="font-bold">🔊 {t('settings_sounds')}</span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" className="sr-only peer" checked={soundEnabled} onChange={() => setSoundEnabled(!soundEnabled)} />
                        <div className="w-14 h-8 bg-theme-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-theme-primary"></div>
                    </label>
                </div>
                
                <div className="p-5 flex justify-between items-center opacity-50">
                    <span className="font-bold">🌙 {t('settings_version')}</span>
                    <span className="text-sm font-mono font-bold">v1.0.0</span>
                </div>
            </div>

            <div className="bg-theme-panel rounded-3xl border-4 border-theme-border overflow-hidden shadow-sm">
                <button 
                    onClick={handleLogout}
                    className="w-full p-5 text-left text-red-500 font-black hover:bg-theme-main transition-colors"
                >
                    🚪 {t('settings_logout')}
                </button>
            </div>
        </div>
    );
}