import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Trash2, LogOut } from 'lucide-react';
import { GameRoom } from '@/types';
import { SwipeableActionCard } from '@/components/ui/SwipeableActionCard';

interface ActiveRoomsListProps {
    rooms: GameRoom[];
    isSurrendering: boolean;
    onSurrender: (roomId: string, resetCard?: () => void) => void;
    onOpenRoom: (roomId: string) => void;
}

export function ActiveRoomsList({ rooms, isSurrendering, onSurrender, onOpenRoom }: ActiveRoomsListProps) {
    const { t } = useTranslation();

    if (rooms.length === 0) return null;

    return (
        <div className="mb-8">
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
                            <div className="bg-theme-panel p-4 rounded-2xl shadow-sm hover:shadow-md flex flex-row justify-between items-center gap-4 cursor-pointer active:scale-[0.98] transition-all duration-300">
                                <div className="flex-1 text-left min-w-0">
                                    <div className="font-bold text-lg text-theme-text flex items-center gap-2">
                                        <span>⏳</span> {t('lobby_your_table') || 'Ваша игра'}
                                    </div>
                                    <div className="text-sm text-theme-text opacity-70 font-medium mt-1 truncate">
                                        {room.status === 'paused' ? t('status_paused') :
                                            room.status === 'pause_requested' ? t('status_pause_req') :
                                                room.status === 'finished' ? t('status_finished') : t('status_playing')}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-amber-500 font-black text-xl">{room.betAmount} 💰</div>
                                    <ChevronRight className="w-5 h-5 text-theme-text opacity-50" />
                                </div>
                            </div>
                        </SwipeableActionCard>
                    );
                })}
            </div>
        </div>
    );
}