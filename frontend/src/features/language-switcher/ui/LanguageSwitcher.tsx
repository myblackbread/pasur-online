"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExpandableCarouselRow, PickerOption } from '@/shared/ui/carousel';
import { RowLabel } from '@/shared/ui/lists/RowLabel';

const LANGUAGE_OPTIONS: PickerOption[] = [
    {
        id: 'en',
        content: <span className="text-4xl">🇬🇧</span>,
        thumbnail: <span className="text-xl">🇬🇧</span>,
        description: 'English'
    },
    {
        id: 'ru',
        content: <span className="text-4xl">🇷🇺</span>,
        thumbnail: <span className="text-xl">🇷🇺</span>,
        description: 'Русский'
    },
    {
        id: 'az',
        content: <span className="text-4xl">🇦🇿</span>,
        thumbnail: <span className="text-xl">🇦🇿</span>,
        description: 'Azərbaycan'
    },
];

export default function LanguageSwitcher() {
    const { t, i18n } = useTranslation();

    // На случай, если i18n.language вернет 'en-US' вместо 'en', 
    // берем только первые две буквы для надежности
    const currentLang = i18n.language ? i18n.language.substring(0, 2) : 'en';

    return (
        <ExpandableCarouselRow
            morphId="global-lang-morph"
            label={<RowLabel icon="🌍" iconBg="bg-blue-500" title={t('language')} />}
            options={LANGUAGE_OPTIONS}
            value={currentLang}
            onChange={lng => i18n.changeLanguage(lng)}
        />
    );
}