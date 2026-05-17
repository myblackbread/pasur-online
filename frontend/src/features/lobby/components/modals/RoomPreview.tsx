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
    const isReadyCheck = room.status === 'ready_check';

    return (
        <div className="flex flex-col text-center mt-2">
            <h2 className="text-2xl sm:text-3xl font-black mb-2 flex items-center justify-center gap-2 text-theme-text">
                <span>{room.players[0]?.name === '__INCOGNITO__' ? t('unknown_player') : (room.players[0]?.name || t('game_player'))}</span>
            </h2>
            <p className="mb-4 text-amber-500 font-black text-xl">{t('game_bet')} {room.betAmount} 💰</p>

            <div className="text-xs opacity-70 font-medium mb-6">
                {room.ruleSet === 'classic' ? t('rule_classic') : t('rule_local')}
                {room.isStrict && <span className="ml-2 text-red-500 font-black">{t('rule_strict')}</span>}
                {room.isSuddenDeath && <span className="ml-2 text-amber-500 font-black">{t('rule_sudden_death')} ⚡</span>}
            </div>

            <div className="space-y-3 mb-6 text-left">
                {Array.from({ length: room.maxPlayers }).map((_, i) => {
                    const p = room.players[i];
                    return (
                        <div key={i} className="flex justify-between items-center bg-theme-main p-4 rounded-xl border-2 border-theme-border shadow-inner">
                            <span className="font-bold text-theme-text">{p ? (p.name === '__INCOGNITO__' ? t('unknown_player') : p.name) : <span className="opacity-50 italic">{t('game_waiting_player')}</span>}{p?.id === safeMyId && t('game_you_suffix')}</span>
                            {p && <span className={`text-sm font-black px-3 py-1 rounded-lg ${p.isReady ? 'bg-theme-primary text-white shadow-md' : 'bg-theme-panel text-theme-text opacity-60 border-2 border-theme-border'}`}>{p.isReady ? t('game_ready') : t('game_thinking')}</span>}
                        </div>
                    );
                })}
            </div>

            {isReadyCheck && (
                <div className="mb-6 animate-pulse">
                    <div className="text-sm text-theme-primary font-black uppercase tracking-widest mb-1">{t('game_starts_in')}</div>
                    <div className="text-6xl font-black text-theme-text drop-shadow-md">{readyTimeLeft}</div>
                </div>
            )}

            {!isSpectator ? (
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => gameApi.toggleReady(room.id!, true).catch(e => showAlert(t(e.message)))}
                        disabled={!isFull || meInfo?.isReady}
                        className={`w-full py-4 rounded-xl font-black transition-all shadow-lg text-lg text-white border-2 border-transparent ${meInfo?.isReady ? 'bg-theme-main border-theme-border text-theme-text opacity-70 cursor-not-allowed' : 'bg-theme-primary hover:opacity-80 hover:shadow-xl active:scale-[0.98]'}`}
                    >
                        {meInfo?.isReady ? t('game_waiting_opponent') : t('game_i_am_ready')}
                    </button>
                    <button onClick={() => onLeave(room.id!)} disabled={isJoining} className="text-red-500 hover:text-red-600 text-sm py-2 font-bold transition-colors">{isJoining ? t('game_leaving') : t('game_leave_table')}</button>
                </div>
            ) : (
                <button onClick={() => onJoin(room.id!)} disabled={isJoining || isFull} className="w-full bg-theme-primary text-white hover:opacity-80 py-4 rounded-xl font-black disabled:opacity-50 shadow-lg active:scale-[0.98] transition-all">{isFull ? t('game_table_full') : (isJoining ? t('game_sitting') : t('game_sit_table'))}</button>
            )}
        </div>
    );
}