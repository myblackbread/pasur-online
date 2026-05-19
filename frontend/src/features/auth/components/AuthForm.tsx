"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { InfoSection } from '@/components/ui/InfoGroup';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

interface AuthFormProps {
    isLoading: boolean;
    onSubmit: (provider: 'google' | 'email' | 'guest', credentials?: any) => void;
}

export function AuthForm({ isLoading, onSubmit }: AuthFormProps) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | null>(null);

    const handleLogin = (provider: 'google' | 'email' | 'guest') => {
        onSubmit(provider, { email, password, gender });
    };

    return (
        <div className="flex flex-col w-full px-2 sm:px-4 pb-8">
            
            <div className="text-center mt-4 mb-8">
                <h1 className="text-4xl font-extrabold mb-2 text-theme-primary">♠ {t('app_title')} ♥</h1>
                <p className="opacity-70 font-medium text-theme-text">{t('auth_subtitle')}</p>
            </div>

            <InfoSection title={t('settings_section_app', 'Приложение')}>
                <LanguageSwitcher />
            </InfoSection>

            <InfoSection title={t('auth_gender', 'Пол')}>
                <SegmentedControl
                    options={[
                        { value: 'male', label: '👨 ' + t('auth_male') },
                        { value: 'female', label: '👩 ' + t('auth_female') }
                    ]}
                    value={gender}
                    onChange={(v) => setGender(v as 'male' | 'female')}
                />
            </InfoSection>

            <div className="flex flex-col gap-4 mb-8">
                <Button
                    variant="amber"
                    icon={<span className="text-xl">🎭</span>}
                    onClick={() => handleLogin('guest')}
                    disabled={!gender}
                    isLoading={isLoading && !email}
                    className="!h-14 !rounded-full text-sm sm:text-base"
                >
                    {t('auth_guest')}
                </Button>

                <Divider label={t('auth_or')} />

                <Button
                    variant="secondary"
                    icon={<span className="text-xl">🌐</span>}
                    onClick={() => handleLogin('google')}
                    disabled={!gender || isLoading}
                    className="!h-14 !rounded-full shadow-sm hover:shadow-md text-sm sm:text-base"
                >
                    {t('auth_google')}
                </Button>
            </div>

            <InfoSection title={t('auth_email_login', 'Вход по Email')}>
                <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth_email')}
                />
                <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth_password')}
                />
            </InfoSection>
            
            <Button
                variant="primary"
                onClick={() => handleLogin('email')}
                disabled={!gender}
                isLoading={isLoading && !!email}
                className="!h-14 !rounded-full text-sm sm:text-base"
            >
                {t('auth_email_btn')}
            </Button>
        </div>
    );
}