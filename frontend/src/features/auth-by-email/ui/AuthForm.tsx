"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/buttons/Button';
import { Divider } from '@/shared/ui/layout/Divider';
import { Input } from '@/shared/ui/inputs/Input';
import { SegmentedControl } from '@/shared/ui/inputs/SegmentedControl';
import { InfoSection } from '@/shared/ui/lists/InfoSection';
import { AuthCredentials, AuthProviderType } from '../model/useAuthAction';

export function AuthForm({
    isLoading,
    onSubmit,
    languageSlot
}: {
    isLoading: boolean;
    onSubmit: (provider: AuthProviderType, credentials: AuthCredentials) => void;
    languageSlot: React.ReactNode;
}) {
    const { t } = useTranslation();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [gender, setGender] = React.useState<'male' | 'female' | null>(null);

    const handleLogin = (provider: AuthProviderType) => {
        onSubmit(provider, { email, password, gender: gender || undefined });
    };

    return (
        <div className="flex flex-col w-full px-2 sm:px-4 gap-4">

            <div className="text-center my-4">
                <h1 className="text-4xl font-extrabold mb-2 text-theme-primary">♠ {t('app_title')} ♥</h1>
                <p className="opacity-70 font-medium text-theme-text">{t('auth_subtitle')}</p>
            </div>

            <InfoSection
                title={t('settings_section_app')}
                items={[{
                    id: 'languageSlotID',
                    interactive: false,
                    variant: 'default',
                    content: languageSlot
                }]}
            />

            <InfoSection
                title={t('auth_gender')}
                items={[{
                    id: 'genderSegmentedControlID',
                    interactive: false,
                    variant: 'none',
                    content: (
                        <SegmentedControl
                            options={[
                                { value: 'male', label: '👨 ' + t('auth_male') },
                                { value: 'female', label: '👩 ' + t('auth_female') }
                            ]}
                            value={gender}
                            onChange={(v) => setGender(v as 'male' | 'female')}
                        />
                    )
                }]}
            />

            <div className="flex flex-col my-4 gap-2">
                <Button
                    variant="amber"
                    icon={<span className="text-xl">🎭</span>}
                    onClick={() => handleLogin('guest')}
                    disabled={!gender}
                    isLoading={isLoading && !email}
                    className="rounded-full! text-sm sm:text-base"
                    fullWidth
                >
                    {t('auth_guest')}
                </Button>

                <Divider label={t('auth_or')} />

                <Button
                    variant="secondary"
                    icon={<span className="text-xl">🌐</span>}
                    onClick={() => handleLogin('google')}
                    disabled={!gender || isLoading}
                    className="rounded-full! shadow-sm hover:shadow-md text-sm sm:text-base"
                    fullWidth
                >
                    {t('auth_google')}
                </Button>
            </div>

            <InfoSection
                title={t('auth_email_login', 'Вход по Email')}
                items={[
                    {
                        id: 'emailInputID',
                        interactive: false,
                        variant: 'default',
                        content: (
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('auth_email')}
                            />
                        )
                    },
                    {
                        id: 'passwordInputID',
                        interactive: false,
                        variant: 'default',
                        content: (
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('auth_password')}
                            />
                        )
                    }
                ]}
            />

            <Button
                variant="primary"
                onClick={() => handleLogin('email')}
                disabled={!gender}
                isLoading={isLoading && !!email}
                className="!h-14 !rounded-full text-sm sm:text-base"
                fullWidth
            >
                {t('auth_email_btn')}
            </Button>
        </div>
    );
}