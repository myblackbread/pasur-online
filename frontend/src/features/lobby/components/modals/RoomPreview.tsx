import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameRoom } from '@/types';
import { useCountdown } from '@/features/game/hooks/useCountdown';
import { gameApi } from '@/lib/supabase';
import { useAlert } from '@/components/providers/AlertProvider';

interface RoomPreviewProps {
    room: GameRoom;
    safeMyId: string;
    isJoining: boolean;
    onJoin: (roomId: string) => void;
    onLeave: (roomId: string) => void;
}

export function RoomPreview({ room, safeMyId, isJoining, onJoin, onLeave }: RoomPreviewProps) {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const readyTimeLeft = useCountdown(room.readyDeadline);

    const isSpectator = !room.players.some(p => p.id === safeMyId);
    const isFull = room.players.length === room.maxPlayers;
    const meInfo = room.players.find(p => p.id === safeMyId);
    const isReadyCheck = room.status === 'ready_check' || room.status === 'ready_check_resume';

    return (
        <div className="flex flex-col">
            {/* Заголовок стола */}
            <h2 className="text-2xl sm:text-3xl font-black text-theme-text mb-4 truncate w-full text-left px-1">
                {room.name || t('game_table')}
            </h2>

            {/* Плиточный интерфейс */}
            <div className="flex gap-2 sm:gap-3 mb-6 items-stretch">
                
                {/* Левая часть: Плитки настроек */}
                <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-3 content-start">
                    {/* Правила */}
                    <div className="bg-theme-main rounded-2xl p-3 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-xl sm:text-2xl mb-1">{room.ruleSet === 'classic' ? '🏛️' : '🏡'}</span>
                        <span className="text-[10px] sm:text-xs font-bold text-theme-text opacity-90">
                            {t(room.ruleSet === 'classic' ? 'rule_classic' : 'rule_local')}
                        </span>
                    </div>

                    {/* Скорость игры */}
                    <div className="bg-theme-main rounded-2xl p-3 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-xl sm:text-2xl mb-1">{room.turnDuration === 15000 ? '⚡' : room.turnDuration === 60000 ? '☕' : '⏱'}</span>
                        <span className="text-[10px] sm:text-xs font-bold text-theme-text opacity-90">
                            {room.turnDuration === 15000 ? '15с' : room.turnDuration === 60000 ? '60с' : '30с'}
                        </span>
                    </div>

                    {/* Дополнительные параметры (условные плитки) */}
                    {room.isStrict && (
                        <div className="bg-red-500/10 text-red-500 rounded-2xl p-2 shadow-sm flex flex-col items-center justify-center text-center">
                            <span className="text-lg sm:text-xl mb-1">⚖️</span>
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{t('rule_strict')}</span>
                        </div>
                    )}
                    {room.isSuddenDeath && (
                        <div className="bg-amber-500/10 text-amber-500 rounded-2xl p-2 shadow-sm flex flex-col items-center justify-center text-center">
                            <span className="text-lg sm:text-xl mb-1">⚡</span>
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{t('rule_sudden_death')}</span>
                        </div>
                    )}
                    {room.isPrivate && (
                        <div className="bg-slate-500/10 text-slate-500 rounded-2xl p-2 shadow-sm flex flex-col items-center justify-center text-center">
                            <span className="text-lg sm:text-xl mb-1">🔒</span>
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">{t('modal_private_table')}</span>
                        </div>
                    )}
                </div>

                {/* Правая часть: Большая плитка ставки */}
                <div className="w-28 sm:w-32 bg-amber-500/10 text-amber-500 rounded-2xl sm:rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center p-4 shrink-0 transition-transform">
                    <span className="text-3xl sm:text-4xl mb-2 drop-shadow-sm">💰</span>
                    <span className="text-2xl sm:text-3xl font-black leading-none">{room.betAmount}</span>
                    <span className="text-[10px] sm:text-xs font-bold opacity-70 mt-1.5 uppercase tracking-widest text-center">
                        {t('game_bet').replace(':', '')}
                    </span>
                </div>
            </div>

            {/* Список игроков за столом */}
            <div className="space-y-3 mb-6 text-left">
                {Array.from({ length: room.maxPlayers }).map((_, i) => {
                    const p = room.players[i];
                    return (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${p ? 'bg-theme-main shadow-md' : 'bg-theme-main/50 shadow-inner opacity-70'}`}>
                            <div className={`w-12 h-12 rounded-xl bg-theme-panel flex items-center justify-center text-2xl shrink-0 ${p ? 'shadow-sm' : 'shadow-inner'}`}>
                                {p ? (p.avatarEmoji || '👤') : ''}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="font-bold text-theme-text truncate text-base">
                                    {p ? (p.name === '__INCOGNITO__' ? t('unknown_player') : p.name) : t('game_waiting_player')}
                                    {p?.id === safeMyId && <span className="opacity-50 text-xs ml-2 font-medium bg-theme-text/10 px-2 py-0.5 rounded-md">{t('game_you_label')}</span>}
                                </div>
                                {p && (
                                    <div className="text-xs font-black mt-1">
                                        {p.isReady ? (
                                            <span className="text-emerald-500 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>{t('game_ready')}
                                            </span>
                                        ) : (
                                            <span className="text-amber-500 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>{t('game_thinking')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Таймер старта (если все нажали готов) */}
            {isReadyCheck && (
                <div className="mb-6 animate-pulse text-center">
                    <div className="text-sm text-theme-primary font-black uppercase tracking-widest mb-1">{t('game_starts_in')}</div>
                    <div className="text-6xl font-black text-theme-text drop-shadow-md">{readyTimeLeft}</div>
                </div>
            )}

            {/* Блок кнопок управления */}
            {!isSpectator ? (
                <div className="flex flex-col gap-3">
                    {!isFull ? (
                        <button disabled className="w-full py-4 rounded-2xl font-black text-lg bg-theme-main text-theme-text opacity-60 shadow-inner">
                            {t('game_waiting_player')}
                        </button>
                    ) : (
                        <button
                            onClick={() => gameApi.toggleReady(room.id!, true).catch(e => showAlert(t(e.message)))}
                            // 🟢 ИСПРАВЛЕНИЕ ЗДЕСЬ: убрано "|| isReadyCheck", теперь кнопка блокируется только если ВЫ УЖЕ нажали готов.
                            disabled={meInfo?.isReady}
                            className={`w-full py-4 rounded-2xl font-black transition-all text-lg ${
                                meInfo?.isReady
                                    ? 'bg-theme-main text-theme-text opacity-60 cursor-not-allowed shadow-inner'
                                    : 'bg-theme-primary text-white shadow-md hover:shadow-lg active:scale-[0.98]'
                            }`}
                        >
                            {/* 🟢 ИСПРАВЛЕНИЕ ЗДЕСЬ: текст меняется только в зависимости от вашей готовности */}
                            {meInfo?.isReady ? t('game_waiting_opponent') : t('game_i_am_ready')}
                        </button>
                    )}

                    {/* Скрываем кнопку выхода, если запущен таймер начала игры */}
                    {!isReadyCheck && (
                        <button onClick={() => onLeave(room.id!)} disabled={isJoining} className="text-red-500 hover:text-red-600 text-sm py-3 font-bold transition-colors">
                            {isJoining ? t('game_leaving') : t('game_leave_table')}
                        </button>
                    )}
                </div>
            ) : (
                <button onClick={() => onJoin(room.id!)} disabled={isJoining || isFull} className="w-full bg-theme-primary text-white hover:opacity-90 py-4 rounded-2xl font-black disabled:opacity-50 shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-lg">
                    {isFull ? t('game_table_full') : (isJoining ? t('game_sitting') : t('game_sit_table'))}
                </button>
            )}
        </div>
    );
}