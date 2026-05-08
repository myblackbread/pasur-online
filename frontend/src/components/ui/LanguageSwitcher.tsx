"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="flex items-center justify-between p-5 border-b-4 border-theme-border bg-theme-panel">
            <span className="font-bold flex items-center gap-2">🌍 {t('language')}</span>
            <div className="flex gap-2">
                <button 
                    onClick={() => changeLanguage('en')} 
                    className={`px-3 py-1 rounded-lg font-bold text-sm transition-colors ${i18n.language === 'en' ? 'bg-theme-primary text-white' : 'bg-theme-main text-theme-text opacity-70'}`}
                >
                    EN
                </button>
                <button 
                    onClick={() => changeLanguage('ru')} 
                    className={`px-3 py-1 rounded-lg font-bold text-sm transition-colors ${i18n.language === 'ru' ? 'bg-theme-primary text-white' : 'bg-theme-main text-theme-text opacity-70'}`}
                >
                    RU
                </button>
                <button 
                    onClick={() => changeLanguage('az')} 
                    className={`px-3 py-1 rounded-lg font-bold text-sm transition-colors ${i18n.language === 'az' ? 'bg-theme-primary text-white' : 'bg-theme-main text-theme-text opacity-70'}`}
                >
                    AZ
                </button>
            </div>
        </div>
    );
}