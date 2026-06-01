import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, LogOut } from 'lucide-react';
import { GameRoom, ActiveRoomCard } from '@/entities/room';
import { SwipeableActionCard } from '@/shared/ui/animations/SwipeableActionCard';
import { PlayerSquare } from '@/entities/user';

interface ActiveRoomsListProps {
    rooms: GameRoom[];
    masks: Record<string, string>;
    isSurrendering: boolean;
    onSurrender: (roomId: string, resetCard?: () => void) => void;
    onOpenRoom: (roomId: string) => void;
}


export function ActiveRoomsWidget({ rooms, masks, isSurrendering, onSurrender, onOpenRoom }: ActiveRoomsListProps) {
    const { t } = useTranslation();
    if (rooms.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-theme-text opacity-70">{t('lobby_active_games')}</h2>
            <div className="w-full space-y-3">
                {rooms.map(room => {
                    const roomId = room.id!;
                    const isFinished = room.status === 'finished' || room.status === 'waiting';
                    const actionText = isFinished ? t('btn_leave') || 'Выйти' : t('btn_surrender') || 'Сдаться';

                    return (
                        <SwipeableActionCard
                            key={roomId}
                            isActionLoading={isSurrendering}
                            actionBgColor="bg-red-500 hover:bg-red-600 active:bg-red-700"
                            onClick={() => onOpenRoom(roomId)}
                            onAction={(resetCard) => onSurrender(roomId, resetCard)}
                            actionContent={
                                <div className="flex flex-col items-center justify-center whitespace-nowrap px-4">
                                    {isFinished ? <LogOut className="w-5 h-5 mb-0.5" /> : <Trash2 className="w-5 h-5 mb-0.5" />}
                                    <span className="text-[10px] uppercase tracking-wider">{actionText}</span>
                                </div>
                            }
                        >
                            <ActiveRoomCard
                                room={room}
                                mask={masks[roomId]}
                                onClick={() => onOpenRoom(roomId)}
                                playerSlot={<PlayerSquare players={room.players} maxPlayers={room.requiredPlayers} />}
                            />
                        </SwipeableActionCard>
                    );
                })}
            </div>
        </div>
    );
}