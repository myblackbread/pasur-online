// frontend/src/components/hubs/ProfileHub.tsx
'use client';

import React, { useState } from 'react';
import { User, LogOut, Shield, EyeOff, Bell } from 'lucide-react';
import { authService } from '@/services/authService';

export const ProfileHub: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [incognito, setIncognito] = useState(false);

  return (
    <div
      className="relative min-h-full w-full bg-bg text-text px-4 flex flex-col overflow-y-auto select-none"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
      }}
    >
      {/* Карточка профиля */}
      <div className="p-4 rounded-3xl bg-card border border-white/5 mb-4 shadow-sm flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-full bg-input border border-white/10 flex items-center justify-center text-accent text-xl font-bold brass-glow">
          👤
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-text truncate">Гость #7142</h3>
          <p className="text-xs text-muted">ID: 8fa9-4081-9b1e</p>
        </div>
      </div>

      {/* Настройки приватности и игры */}
      <div className="mb-4">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1 mb-2 block">
          Приватность и игра
        </span>
        <div className="rounded-3xl bg-card border border-white/5 divide-y divide-white/5 overflow-hidden">
          <div
            onClick={() => setIncognito(!incognito)}
            className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-input flex items-center justify-center text-accent">
                <EyeOff size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text">Режим Инкогнито</span>
                <span className="text-xs text-muted">Скрывать реальный ID за столами</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={incognito}
              onChange={(e) => setIncognito(e.target.checked)}
              className="accent-accent w-4 h-4"
            />
          </div>

          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-input flex items-center justify-center text-accent">
                <Shield size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text">E2EE Ключи</span>
                <span className="text-xs text-emerald-400 font-medium">Активны (ECDH P-256)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Кнопка выхода */}
      <div className="mt-auto">
        <button
          type="button"
          onClick={async () => {
            await authService.signOut();
            onLogout();
          }}
          className="w-full py-3.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <LogOut size={15} />
          <span>Выйти из аккаунта</span>
        </button>
      </div>
    </div>
  );
};