'use client';

import React from 'react';

export default function PwaAppPage() {
  return (
    <main
      className="w-full h-dvh bg-red-600 text-white select-none flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      <div className="p-6 bg-black/30 backdrop-blur-md rounded-3xl border border-white/20 flex flex-col items-center gap-2 text-center">
        <span className="text-3xl font-extrabold tracking-tight">PWA READY</span>
        <p className="text-xs text-white/80 max-w-xs">
          Автономный режим активен. Базовая геометрия и safe-area работают штатно.
        </p>
      </div>
    </main>
  );
}