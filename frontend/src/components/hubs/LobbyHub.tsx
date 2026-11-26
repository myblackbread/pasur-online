'use client';

import React from 'react';
import { Plus, Users, Shield, Play } from 'lucide-react';
import { useCapsuleSheet } from '@/app/hybrid-scrollbar';
import { defineContract } from '@/app/hybrid-scrollbar/shared/contract';

export const CreateRoomContract = defineContract<'create-room-sheet', void>('create-room-sheet');

export const LobbyHub: React.FC = () => {
  // Кнопка в контролл-баре
  useCapsuleSheet({
    icon: Plus,
    label: 'Создать стол',
    contract: CreateRoomContract,
    options: { detents: ['large', 'medium'] },
  });

  const mockRooms = [
    { id: '1', name: 'Пасур: Высокие ставки', bet: 1000, players: '1/2', type: 'pasur' },
    { id: '2', name: 'Пасур: Классика (Strict)', bet: 200, players: '2/4', type: 'pasur' },
    { id: '3', name: 'Дурак переводной', bet: 500, players: '1/2', type: 'durak' },
  ];

  return (
    <div
      className="relative min-h-full w-full bg-bg text-text px-4 flex flex-col overflow-y-auto select-none"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
      }}
    >
      {/* Верхний статус / баланс */}
      <div className="p-4 rounded-3xl bg-card border border-white/5 mb-4 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Баланс кошелька</span>
          <h3 className="text-lg font-bold text-accent">2 500 монет</h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center font-bold text-sm brass-glow">
          💎
        </div>
      </div>

      {/* Список комнат */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Активные столы</span>
        <span className="text-xs text-muted">Онлайн: 42</span>
      </div>

      <div className="space-y-3">
        {mockRooms.map((room) => (
          <div
            key={room.id}
            className="p-4 rounded-3xl bg-card border border-white/5 flex flex-col gap-3 shadow-sm hover:border-white/10 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm text-text">{room.name}</h4>
                <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                  <Shield size={12} className="text-emerald-400" />
                  <span>Ставка: {room.bet} монет</span>
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-input border border-white/10 flex items-center gap-1">
                <Users size={12} className="text-muted" /> {room.players}
              </span>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] text-muted capitalize">{room.type}</span>
              <button
                type="button"
                className="px-4 py-1.5 rounded-full bg-accent text-accent-text text-xs font-bold flex items-center gap-1 brass-glow"
              >
                <Play size={12} />
                <span>Сесть за стол</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};