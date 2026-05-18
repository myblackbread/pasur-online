import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameRoom } from '@/types';
import { ChevronRight } from 'lucide-react';

interface OpenRoomsListProps {
    rooms: GameRoom[];
    onOpenRoom: (roomId: string) => void;
    title?: string;
    onClear?: () => void;
}

const getCardStyle = (room: GameRoom) => {
    if (room.betAmount >= 5000) return 'border-purple-500/40 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.1)]';
    if (room.betAmount >= 1000) return 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    return 'border-theme-border/30 bg-theme-panel shadow-sm';
};

const PlayerSquare = ({ players, maxPlayers }: { players: any[], maxPlayers: number }) => {
    const isFour = maxPlayers === 4;
    const seats = Array.from({ length: maxPlayers });
    
    if (isFour) {
        return (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 gap-[1px] bg-theme-border/40 shrink-0 shadow-sm">
                {seats.map((_, i) => {
                    const p = players[i];
                    return (
                        <div key={i} className={`flex items-center justify-center transition-colors ${p ? 'bg-theme-main text-theme-text' : 'bg-theme-panel/50 opacity-50'}`}>
                            {p ? <span className="text-[10px] sm:text-xs drop-shadow-sm leading-none">{p.avatarEmoji || '👤'}</span> : null}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden flex gap-[1px] bg-theme-border/40 shrink-0 shadow-sm relative">
            <div className={`relative flex-1 h-full overflow-hidden transition-colors ${players[0] ? 'bg-theme-main text-theme-text' : 'bg-theme-panel/50'}`}>
                {players[0] && (
                    <span className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl drop-shadow-sm leading-none z-10">
                        {players[0].avatarEmoji || '👤'}
                    </span>
                )}
            </div>
            <div className={`relative flex-1 h-full overflow-hidden transition-colors ${players[1] ? 'bg-theme-main text-theme-text' : 'bg-theme-panel/50'}`}>
                {players[1] && (
                    <span className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-3xl drop-shadow-sm leading-none z-10">
                        {players[1].avatarEmoji || '👤'}
                    </span>
                )}
            </div>
        </div>
    );
}

export function OpenRoomsList({ rooms, onOpenRoom, title, onClear }: OpenRoomsListProps) {
    const { t } = useTranslation();

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-theme-text opacity-70">
                    {title || t('lobby_open_tables')}
                </h2>
                {onClear && (
                    <button onClick={onClear} className="text-xs sm:text-sm font-bold text-red-500 hover:text-white hover:bg-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                        {t('lobby_clear_search', 'Сбросить')}
                    </button>
                )}
            </div>
            
            <div className="grid gap-3 sm:gap-4 w-full">
                {rooms.length === 0 ? (
                    <div className="text-center py-12 text-theme-text opacity-50 shadow-inner rounded-3xl font-bold bg-theme-panel/50">
                        {t('lobby_no_active')}
                    </div>
                ) : (
                    rooms.map(room => {
                        const roomId = room.id!;
                        return (
                            <div
                                key={roomId}
                                onClick={() => onOpenRoom(roomId)}
                                className={`p-3 sm:p-4 rounded-2xl hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center gap-3 sm:gap-4 border ${getCardStyle(room)} overflow-hidden`}
                            >
                                <PlayerSquare players={room.players} maxPlayers={room.maxPlayers} />
                                
                                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                                    <div className="font-bold text-base sm:text-lg text-theme-text truncate w-full flex items-center gap-2">
                                        <span className="truncate">{room.name || "Игровой стол"}</span>
                                    </div>
                                    
                                    <div className="flex flex-nowrap items-center gap-1.5 mt-1.5 overflow-hidden [mask-image:linear-gradient(to_right,#000_85%,transparent)] pr-4">
                                        <span className="bg-theme-main px-2 py-0.5 rounded-md shadow-sm text-[10px] sm:text-xs font-bold text-theme-text opacity-80 shrink-0">
                                            {room.ruleSet === 'classic' ? '🏛️' : '🏡'}
                                        </span>
                                        {room.isStrict && <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold shrink-0" title={t('rule_strict')}>⚖️</span>}
                                        {room.isSuddenDeath && <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold shrink-0" title={t('rule_sudden_death')}>⚡</span>}
                                        {room.isPrivate && <span className="bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold shrink-0" title={t('modal_private_table')}>🔒</span>}
                                        <span className="bg-theme-main px-2 py-0.5 rounded-md shadow-sm text-[10px] sm:text-xs opacity-70 font-medium shrink-0">
                                            {room.turnDuration === 15000 ? '⚡ 15с' : room.turnDuration === 60000 ? '☕ 60с' : '⏱ 30с'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-1">
                                    <div className="font-black text-lg sm:text-xl text-amber-500 whitespace-nowrap drop-shadow-sm">
                                        {room.betAmount} <span className="opacity-80 text-sm">💰</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-theme-text opacity-30 shrink-0" />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
}