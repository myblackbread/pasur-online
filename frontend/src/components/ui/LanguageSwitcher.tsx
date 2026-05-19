"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExpandableCarouselRow, PickerOption } from '@/components/ui/carousel-picker';
import { RowLabel } from '@/components/ui/InfoGroup';

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
            label={<RowLabel icon="🌍" iconBg="bg-blue-500" title={t('language')} />}
            options={LANGUAGE_OPTIONS}
            value={i18n.language}
            onChange={(lng) => i18n.changeLanguage(lng)}
            requireConfirm={true}
        />
    );
}