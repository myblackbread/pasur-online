"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExpandableCarouselRow, PickerOption } from '@/components/ui/carousel-picker';

const LANGUAGE_OPTIONS: PickerOption[] = [
    { id: 'en', content: '🇬🇧', description: 'English' },
    { id: 'ru', content: '🇷🇺', description: 'Русский' },
    { id: 'az', content: '🇦🇿', description: 'Azərbaycan' },
];

export default function LanguageSwitcher() {
    const { t, i18n } = useTranslation();

    return (
        <ExpandableCarouselRow
            morphId="global-lang-morph"
            label={
                <>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm bg-blue-500 text-sm">🌍</div>
                    <span className="font-bold text-sm text-theme-text">{t('language')}</span>
                </>
            }
            options={LANGUAGE_OPTIONS}
            value={i18n.language}
            onChange={(lng) => i18n.changeLanguage(lng)}
            requireConfirm={false}
        />
    );
}