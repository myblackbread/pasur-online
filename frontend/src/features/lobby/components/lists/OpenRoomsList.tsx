import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameRoom } from '@/types';
import { NavigationItem } from '@/components/ui/NavigationItem';

interface OpenRoomsListProps {
    rooms: GameRoom[];
    onOpenRoom: (roomId: string) => void;
}

export function OpenRoomsList({ rooms, onOpenRoom }: OpenRoomsListProps) {
    const { t } = useTranslation();

    return (
        <>
            <h2 className="text-xl font-bold mb-4 text-theme-text opacity-70">{t('lobby_open_tables')}</h2>
            <div className="grid gap-3 sm:gap-4 w-full">
                {rooms.length === 0 ? (
                    <div className="text-center py-12 text-theme-text opacity-50 shadow-inner rounded-3xl font-bold">
                        {t('lobby_no_active')}
                    </div>
                ) : (
                    rooms.map(room => {
                        const roomId = room.id!;
                        return (
                            <div
                                key={roomId}
                                onClick={() => onOpenRoom(roomId)}
                                className="bg-theme-panel p-3 sm:p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer active:scale-[0.98]"
                            >
                                <NavigationItem rightContent={<span className="font-black text-lg sm:text-xl text-amber-500 whitespace-nowrap">{room.betAmount} 💰</span>}>
                                    <div className="text-xl sm:text-2xl shrink-0 bg-theme-main w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-inner">🎲</div>
                                    <div className="min-w-0 flex flex-col justify-center text-left">
                                        <div className="font-bold text-base sm:text-lg text-theme-text truncate w-full">{t('lobby_table') || 'Игровой стол'}</div>
                                        <div className="text-[10px] sm:text-xs text-theme-text opacity-70 font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
                                            <span className="bg-theme-main px-2 py-0.5 rounded-md shadow-sm">
                                                {room.ruleSet === 'classic' ? t('rule_classic') : t('rule_local')}
                                            </span>
                                            {room.isStrict && <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md font-bold">{t('rule_strict')}</span>}
                                            {room.isSuddenDeath && <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md font-bold">⚡</span>}
                                            <span className="text-theme-primary font-bold ml-1">({room.players.length}/{room.maxPlayers})</span>
                                        </div>
                                    </div>
                                </NavigationItem>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
}