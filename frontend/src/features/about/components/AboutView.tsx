import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoSection, InfoRow } from '@/components/ui/InfoGroup';

export default function AboutView() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col w-full">
            <h1 className="text-2xl sm:text-3xl font-black mb-6">{t('about_title')}</h1>

            <InfoSection>
                <InfoRow 
                    icon="📜"
                    iconBg="bg-blue-500"
                    title={t('profile_rules')}
                    onClick={() => { /* Логика открытия правил */ }}
                    rightContent={<span className="text-theme-text opacity-50 font-bold">❯</span>}
                    noDivider
                />
            </InfoSection>

            <InfoSection title={t('about_authors')}>
                <InfoRow 
                    icon="👨‍💻"
                    iconBg="bg-theme-main text-xl shadow-inner border border-theme-border/30"
                    title="Your Name / Team"
                    subtitle={t('about_developer')}
                />
                <div className="p-4 text-sm font-medium text-theme-text opacity-70 leading-relaxed">
                    {t('about_credits_text')}
                </div>
            </InfoSection>

            <div className="flex flex-col items-center justify-center opacity-50 mt-8">
                <div className="text-4xl mb-2 grayscale">♠️♥️</div>
                <div className="font-black tracking-widest uppercase text-sm">Pasur Card Game</div>
                <div className="font-mono text-xs mt-1">v1.0.0</div>
            </div>
        </div>
    );
}