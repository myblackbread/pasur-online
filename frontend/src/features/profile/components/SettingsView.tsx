import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { authApi, supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/components/providers/AlertProvider';
import { AppleToggle } from '@/components/ui/AppleToggle';
import { InfoSection, InfoRow } from '@/components/ui/InfoGroup';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';

export default function SettingsView({ user }: { user: UserProfile }) {
    const { t, i18n } = useTranslation();
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

    const LanguageControl = () => (
        <div className="flex bg-theme-main p-1 rounded-lg border border-theme-border/50">
            {['en', 'ru', 'az'].map(lng => (
                <button
                    key={lng}
                    onClick={(e) => { e.stopPropagation(); i18n.changeLanguage(lng); }}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all uppercase ${i18n.language === lng ? 'bg-theme-panel shadow text-theme-primary' : 'opacity-60 text-theme-text hover:opacity-100'}`}
                >
                    {lng}
                </button>
            ))}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 max-w-md mx-auto pb-24">
            <h1 className="text-2xl sm:text-3xl font-black mb-6">{t('settings_title')}</h1>

            <InfoSection title={t('settings_section_account')}>
                {!hasGoogleLinked && (
                    <InfoRow 
                        icon="🌐" 
                        iconBg="bg-amber-500" 
                        title={t('settings_link_google')} 
                        subtitle={t('settings_guest_warning')}
                        onClick={handleLinkGoogle}
                        rightContent={
                            <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                                {isLinking ? "..." : t('settings_link_google')}
                            </span>
                        }
                        noDivider
                    />
                )}
                {hasGoogleLinked && (
                    <InfoRow 
                        icon="✅" 
                        iconBg="bg-emerald-500" 
                        title="Google Account" 
                        subtitle={sbUser?.email || "Linked successfully"}
                        noDivider
                    />
                )}
            </InfoSection>

            <InfoSection title={t('settings_section_app')}>
                <InfoRow 
                    icon="🌍" 
                    iconBg="bg-blue-500" 
                    title={t('language')} 
                    rightContent={<LanguageControl />} 
                />
                <InfoRow 
                    icon="🕵️‍♀️" 
                    iconBg="bg-slate-700 dark:bg-slate-500" 
                    title={t('settings_incognito')} 
                    subtitle={t('settings_incognito_desc')}
                    rightContent={<AppleToggle checked={isIncognito} onChange={toggleIncognito} />} 
                />
                <InfoRow 
                    icon="🔊" 
                    iconBg="bg-rose-500" 
                    title={t('settings_sounds')} 
                    rightContent={<AppleToggle checked={soundEnabled} onChange={setSoundEnabled} />} 
                    noDivider
                />
            </InfoSection>

            <InfoSection title={t('settings_section_danger')}>
                <InfoRow 
                    icon="🚪" 
                    iconBg="bg-red-500" 
                    title={<span className="text-red-500">{t('settings_logout')}</span>} 
                    onClick={handleLogout}
                    rightContent={<span className="text-red-500 opacity-50 font-bold">❯</span>}
                    noDivider
                />
            </InfoSection>
        </div>
    );
}