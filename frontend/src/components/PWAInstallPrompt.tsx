'use client';

import { useEffect } from 'react';

export function PWAInstallPrompt() {
    useEffect(() => {
        import('@khmyznikov/pwa-install');
    }, []);

    return (
        <pwa-install
            manifest-url="/manifest.webmanifest"
            name="Game App"
            icon="/icons/icon-192.png"
            description="Система онлайн-игры и чатов"
            install-description="Установите приложение для быстрого доступа и стабильной работы."
            disable-screenshots="true"
        />
    );
}