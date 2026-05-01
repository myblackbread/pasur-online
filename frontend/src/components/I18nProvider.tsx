"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function I18nProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Этот код выполнится только в браузере
        setMounted(true);
    }, []);

    // Пока клиент не смонтирован (и не определил язык из браузера),
    // мы не рендерим детей, чтобы избежать конфликта SSR и Client.
    if (!mounted) {
        // Возвращаем пустой фрагмент, чтобы избежать мерцания.
        // Цвет фона уже задан в <body> в layout.tsx
        return null; 
    }

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}