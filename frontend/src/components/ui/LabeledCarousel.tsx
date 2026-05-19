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
        <div className="p-3 sm:p-4 hover:bg-theme-main/30 transition-colors">
            <ExpandableCarouselRow
                morphId="global-lang-morph"
                label={`🌍 ${t('language')}`}
                options={LANGUAGE_OPTIONS}
                value={i18n.language}
                onChange={(lng) => i18n.changeLanguage(lng)}
                requireConfirm={false} // Язык переключается мгновенно
            />
        </div>
    );
}