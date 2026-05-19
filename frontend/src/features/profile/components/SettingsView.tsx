import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { authApi, supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/components/providers/AlertProvider';

// Импортируем наши обновленные компоненты
import { InfoSection, InfoRow, RowLabel } from '@/components/ui/InfoGroup';
import { SwitchRow } from '@/components/ui/SwitchRow';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

export default function SettingsView({ user }: { user: UserProfile }) {
    const { t } = useTranslation();
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();

    const [soundEnabled, setSoundEnabled] = useState(true);
    const [sbUser, setSbUser] = useState<User | null>(null);
    const [isLinking, setIsLinking] = useState(false);
    const [isIncognito, setIsIncognito] = useState(user.settings?.isIncognito || false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setSbUser(user));
    }, []);

    const handleLogout = () => {
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

    const toggleIncognito = async (newValue: boolean) => {
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
        <div className="flex flex-col w-full">
            <h1 className="text-2xl sm:text-3xl font-black mb-6 px-2">{t('settings_title')}</h1>

            <InfoSection title={t('settings_section_account')}>
                {!hasGoogleLinked ? (
                    <InfoRow onClick={handleLinkGoogle} className="px-3">
                        <RowLabel
                            icon="🌐" iconBg="bg-amber-500"
                            title={t('settings_link_google')}
                            subtitle={t('settings_guest_warning')}
                        />
                        <div className="shrink-0 ml-3 flex items-center pointer-events-none">
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                                {isLinking ? "..." : t('settings_link_google')}
                            </span>
                        </div>
                    </InfoRow>
                ) : (
                    <InfoRow>
                        <RowLabel 
                            icon="✅" iconBg="bg-emerald-500" 
                            title="Google Account" 
                            subtitle={sbUser?.email || "Linked successfully"}
                        />
                    </InfoRow>
                )}
            </InfoSection>

            <InfoSection title={t('settings_section_app')}>
                <LanguageSwitcher />
                
                <SwitchRow 
                    icon="🕵️‍♀️" iconBg="bg-slate-700 dark:bg-slate-500" 
                    title={t('settings_incognito')} 
                    subtitle={t('settings_incognito_desc')}
                    checked={isIncognito} 
                    onChange={toggleIncognito} 
                />
                
                <SwitchRow 
                    icon="🔊" iconBg="bg-rose-500" 
                    title={t('settings_sounds')} 
                    checked={soundEnabled} 
                    onChange={setSoundEnabled} 
                />
            </InfoSection>

            <InfoSection title={t('settings_section_danger')}>
                <InfoRow onClick={handleLogout}>
                    <RowLabel 
                        icon="🚪" iconBg="bg-red-500" 
                        title={<span className="text-red-500">{t('settings_logout')}</span>} 
                    />
                    <div className="shrink-0 ml-3 flex items-center">
                        <span className="text-red-500 opacity-50 font-bold">❯</span>
                    </div>
                </InfoRow>
            </InfoSection>
        </div>
    );
}