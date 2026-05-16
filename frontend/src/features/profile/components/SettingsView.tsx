import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { authApi, supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useAlert } from '@/components/providers/AlertProvider';
import { Divider } from '@/components/ui/Divider';

export default function SettingsView({ user }: { user: UserProfile }) {
    const { t } = useTranslation();
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();

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
        showConfirm(t('settings_logout_confirm'), async () => {
            await supabase.auth.signOut();
            localStorage.removeItem('pasurUid');
            router.push('/');
        });
    };

    const handleLinkGoogle = async () => {
        setIsLinking(true);
        try {
            await authApi.linkGoogleAccount();
            showAlert(t('settings_google_linked'));
        } catch (error: any) {
            showAlert(error.message);
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
            setIsIncognito(!newValue);
            showAlert(t('settings_update_error'));
        }
    };

    const hasGoogleLinked = sbUser?.app_metadata?.providers?.includes('google');

    return (
        <div className="p-4 sm:p-6 max-w-md mx-auto pb-12 sm:pb-24">
            <h1 className="text-2xl sm:text-3xl font-black mb-4 sm:mb-6">{t('settings_title')}</h1>

            {sbUser && !hasGoogleLinked && (
                // 🟢 Убрали border-2 border-amber-500. Оставили красивый фон и shadow-md
                <div className="bg-amber-100 dark:bg-amber-900/40 rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 shadow-md">
                    <h3 className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-2 text-base sm:text-lg">
                        <span>⚠️</span> {t('settings_save_progress')}
                    </h3>
                    <p className="text-xs sm:text-sm opacity-80 mb-4 font-medium text-amber-900 dark:text-amber-100">
                        {t('settings_guest_warning')} <span className="font-bold">{user.balance} 💰</span> {t('settings_guest_warning_end')}
                    </p>
                    <button
                        onClick={handleLinkGoogle}
                        disabled={isLinking}
                        // 🟢 Добавили shadow-md для кнопки
                        className="w-full bg-amber-500 text-white font-black py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-600 transition shadow-md disabled:opacity-50"
                    >
                        {isLinking ? t('settings_linking') : `🌐 ${t('settings_link_google')}`}
                    </button>
                </div>
            )}

            <div className="bg-theme-panel rounded-3xl shadow-md overflow-hidden mb-4 sm:mb-6 flex flex-col">

                {/* 1. Язык */}
                <LanguageSwitcher />

                {/* 🟢 Наш новый надежный компонент с отступом */}
                <Divider indent />

                {/* 2. Инкогнито */}
                <div className="p-4 flex justify-between items-center bg-theme-panel hover:bg-theme-main transition-colors">
                    <div>
                        <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                            <span className="w-6 text-center">🕵️</span> {t('settings_incognito')}
                        </div>
                        <div className="text-[10px] sm:text-xs opacity-60 mt-1 max-w-[200px] font-medium leading-tight ml-8">
                            {t('settings_incognito_desc')}
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                        <input type="checkbox" className="sr-only peer" checked={isIncognito} onChange={toggleIncognito} />
                        <div className="w-12 h-7 bg-theme-border/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary shadow-inner"></div>
                    </label>
                </div>

                {/* 🟢 Разделитель */}
                <Divider indent />

                {/* 3. Звуки */}
                <div className="p-4 flex justify-between items-center bg-theme-panel hover:bg-theme-main transition-colors">
                    <span className="font-bold text-sm sm:text-base flex items-center gap-2">
                        <span className="w-6 text-center">🔊</span> {t('settings_sounds')}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                        <input type="checkbox" className="sr-only peer" checked={soundEnabled} onChange={() => setSoundEnabled(!soundEnabled)} />
                        <div className="w-12 h-7 bg-theme-border/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary shadow-inner"></div>
                    </label>
                </div>

                {/* 🟢 Разделитель */}
                <Divider indent />

                {/* 4. Версия */}
                <div className="p-4 flex justify-between items-center opacity-50 bg-theme-panel">
                    <span className="font-bold text-sm sm:text-base flex items-center gap-2">
                        <span className="w-6 text-center">🌙</span> {t('settings_version')}
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-bold">v1.0.0</span>
                </div>
            </div>

            {/* 🟢 Кнопка выхода: сделана как "парящая" отдельная карточка */}
            <div className="bg-theme-panel rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                <button
                    onClick={handleLogout}
                    className="w-full p-4 text-center text-red-500 font-black hover:bg-red-500/10 transition-colors text-sm sm:text-base flex justify-center items-center gap-2"
                >
                    🚪 {t('settings_logout')}
                </button>
            </div>
        </div>
    );
}