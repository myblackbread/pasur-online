'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { PWAInstallElement } from '@khmyznikov/pwa-install';

export function PWAInstallView() {
  const router = useRouter();
  const pwaRef = useRef<PWAInstallElement | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone === true);

    if (isStandalone) {
      router.replace('/app');
      return;
    }

    import('@khmyznikov/pwa-install').then(() => {
      if (pwaRef.current) {
        pwaRef.current.showDialog(true);
      }
    });
  }, [router]);

  const handleOpenDialog = () => {
    pwaRef.current?.showDialog(true);
  };

  return (
    <main className="min-h-dvh w-full flex flex-col items-center justify-between bg-black text-white p-6 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+16px)] text-center relative select-none">
      {/* Верхний отступ/заглушка шапки */}
      <div className="w-full max-w-xs h-10" />

      {/* Центральный контент установки */}
      <div className="my-auto flex flex-col items-center">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl font-bold text-accent shadow-xl brass-glow">
          PWA
        </div>

        <h1 className="text-xl font-bold mb-2 text-text">Установка приложения</h1>
        <p className="text-zinc-400 text-sm max-w-xs mb-6 leading-relaxed">
          Для доступа к игре и зашифрованным чатам установите приложение на домашний экран.
        </p>

        <button
          type="button"
          onClick={handleOpenDialog}
          className="px-6 py-3 bg-accent text-accent-text text-sm font-bold rounded-2xl active:scale-95 transition-transform shadow-lg brass-glow cursor-pointer"
        >
          Установить
        </button>
      </div>

      <div className="text-[11px] text-zinc-500">
        Standalone Web Engine
      </div>

      <pwa-install
        ref={pwaRef}
        manifest-url="/manifest.webmanifest"
        name="Game App"
        icon="/icons/icon-192.png"
        description="Карточная игра и приватные чаты"
        install-description="Установите приложение для работы в полноэкранном режиме."
        disable-screenshots="true"
      />
    </main>
  );
}