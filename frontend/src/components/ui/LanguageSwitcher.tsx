"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        // 🟢 Убрали border-b-4 и bg-theme-panel (он наследуется)
        <div className="flex items-center justify-between p-4 hover:bg-theme-main transition-colors">
            <span className="font-bold flex items-center gap-2 text-sm sm:text-base">
                <span>🌍</span> {t('language')}
            </span>
            <div className="flex gap-2">
                <button 
                    onClick={() => changeLanguage('en')} 
                    // 🟢 Добавили легкую тень активной кнопке
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${i18n.language === 'en' ? 'bg-theme-primary text-white shadow-md' : 'bg-theme-main text-theme-text opacity-70 hover:opacity-100'}`}
                >
                    EN
                </button>
                <button 
                    onClick={() => changeLanguage('ru')} 
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${i18n.language === 'ru' ? 'bg-theme-primary text-white shadow-md' : 'bg-theme-main text-theme-text opacity-70 hover:opacity-100'}`}
                >
                    RU
                </button>
                <button 
                    onClick={() => changeLanguage('az')} 
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all ${i18n.language === 'az' ? 'bg-theme-primary text-white shadow-md' : 'bg-theme-main text-theme-text opacity-70 hover:opacity-100'}`}
                >
                    AZ
                </button>
            </div>
        </div>
    );
}