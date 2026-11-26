'use client';

import React from 'react';
import { Trophy, Clock, CheckCircle } from 'lucide-react';

export const MatchesHub: React.FC = () => {
  return (
    <div
      className="relative min-h-full w-full bg-bg text-text px-4 flex flex-col overflow-y-auto select-none"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
      }}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">История матчей</span>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-3xl bg-card border border-white/5 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Trophy size={14} /> Победа (+1 800)
            </span>
            <span className="text-[11px] text-muted">Сегодня, 14:30</span>
          </div>
          <p className="text-xs text-text font-medium">Пасур (1v1) против Игрок #8492</p>
          <div className="text-[11px] text-muted flex items-center gap-1 border-t border-white/5 pt-2">
            <CheckCircle size={12} className="text-muted" /> Финальный счёт: 11 - 6
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-white/5 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400">Поражение (-500)</span>
            <span className="text-[11px] text-muted">Вчера, 22:15</span>
          </div>
          <p className="text-xs text-text font-medium">Пасур (1v1) против Игрок #1042</p>
          <div className="text-[11px] text-muted flex items-center gap-1 border-t border-white/5 pt-2">
            <Clock size={12} className="text-muted" /> Финальный счёт: 8 - 11
          </div>
        </div>
      </div>
    </div>
  );
};