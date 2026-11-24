import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/entities/user';
import { supabase } from '@/shared1/api';
import { authApi } from '@/entities/session';
import { User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/app/providers/AlertProvider';

import { InfoSection } from '@/shared1/ui/lists/InfoSection';
import { SwitchRow } from '@/shared1/ui/lists/SwitchRow';
import { ActionRow } from '@/shared1/ui/lists/ActionRow';

export default function SettingsWidget({
    user,
    languageSlot
}: {
    user: UserProfile
    languageSlot: React.ReactNode;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const { showAlert } = useAlert();

    const [soundEnabled, setSoundEnabled] = useState(true);
    const [sbUser, setSbUser] = useState<User | null>(null);
    const [isLinking, setIsLinking] = useState(false);
    const [isIncognito, setIsIncognito] = useState(user.settings?.isIncognito || false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setSbUser(user));
    }, []);

    const handleLogout = () => {
        showAlert({
            title: t('settings_logout_confirm'),
            buttons: [
                { text: t('alert_cancel'), style: "cancel" },
                {
                    text: t('alert_yes'),
                    style: "destructive",
                    onPress: async () => {
                        await supabase.auth.signOut();
                        localStorage.removeItem('pasurUid');
                        router.push('/');
                    }
                }
            ]
        });
    };

    const handleLinkGoogle = async () => {
        setIsLinking(true);
        try {
            await authApi.linkGoogleAccount();
            showAlert({
                title: t('settings_google_linked'),
                buttons: [{ text: t('alert_ok'), style: "cancel" }]
            });
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
            await supabase.from('users').update({ settings: newSettings }).eq('id', user.id); // <-- Изменено тут
        } catch (error) {
            setIsIncognito(!newValue);
            showAlert({
                title: t('settings_update_error'),
                buttons: [{ text: t('alert_ok'), style: "cancel" }]
            });
        }
    };

    const hasGoogleLinked = sbUser?.app_metadata?.providers?.includes('google');

    return (
        <div className="flex flex-col w-full">
            <h1 className="text-2xl sm:text-3xl font-black mb-6 px-2">{t('settings_title')}</h1>

            <InfoSection
                title={t('settings_section_account')}
                items={[{
                    id: '1',
                    interactive: true,
                    variant: 'default',
                    content: (
                        !hasGoogleLinked ? (
                            <ActionRow
                                icon="🌐" iconBg="bg-amber-500"
                                title={t('settings_link_google')}
                                subtitle={t('settings_guest_warning')}
                                onClick={handleLinkGoogle}
                                rightContent={
                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                                        {isLinking ? "..." : t('settings_link_google')}
                                    </span>
                                }
                                showArrow={false}
                            />
                        ) : (
                            <ActionRow
                                icon="✅" iconBg="bg-emerald-500"
                                title="Google Account"
                                subtitle={sbUser?.email || "Linked successfully"}
                                showArrow={false}
                            />
                        )
                    )
                }]}
            />

            <InfoSection
                title={t('settings_section_account')}
                items={[
                    {
                        id: '2',
                        interactive: true,
                        variant: 'default',
                        content: languageSlot
                    },
                    {
                        id: '3',
                        interactive: true,
                        variant: 'default',
                        content: (<SwitchRow
                            icon="🕵️‍♀️" iconBg="bg-slate-700 dark:bg-slate-500"
                            title={t('settings_incognito')}
                            subtitle={t('settings_incognito_desc')}
                            checked={isIncognito}
                            onChange={toggleIncognito}
                        />)
                    },
                    {
                        id: '4',
                        interactive: true,
                        variant: 'default',
                        content: (<SwitchRow
                            icon="🔊" iconBg="bg-rose-500"
                            title={t('settings_sounds')}
                            checked={soundEnabled}
                            onChange={setSoundEnabled}
                        />)
                    },
                ]}
            />

            <InfoSection
                title={t('settings_section_danger')}
                items={[{
                    id: '5',
                    interactive: true,
                    variant: 'default',
                    content: (<ActionRow
                        icon="🚪" iconBg="bg-red-500"
                        title={<span className="text-red-500">{t('settings_logout')}</span>}
                        onClick={handleLogout}
                    />)
                }]}
            />
        </div >
    );
}