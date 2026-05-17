import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Trash2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameRoom } from '@/types';
import { SwipeableActionCard } from '@/components/ui/SwipeableActionCard';
import { useCountdown } from '@/features/game/hooks/useCountdown';
import { TimerBorder } from '@/components/ui/TimerBorder';

interface ActiveRoomsListProps {
    rooms: GameRoom[];
    masks: Record<string, string>;
    isSurrendering: boolean;
    onSurrender: (roomId: string, resetCard?: () => void) => void;
    onOpenRoom: (roomId: string) => void;
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
            <div className="w-full h-full rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 gap-[1px] bg-theme-border/40 shadow-sm">
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
        <div className="w-full h-full rounded-xl overflow-hidden flex gap-[1px] bg-theme-border/40 shadow-sm relative">
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
};

const ActiveRoomCard = ({ room, mask, onClick }: { room: GameRoom, mask?: string, onClick: () => void }) => {
    const { t } = useTranslation();
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setShowSettings(prev => !prev);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    const isReadyCheck = room.status === 'ready_check' || room.status === 'ready_check_resume';
    const isPlaying = room.status === 'playing';
    const isPauseReq = room.status === 'pause_requested';

    const rawReadyTime = useCountdown(room.readyDeadline);
    const rawTurnTime = useCountdown(room.turnDeadline);

    const me = room.players.find(p => p.id === mask);
    const isMyTurn = isPlaying && room.gameState?.players?.[room.gameState.currentTurnIndex]?.id === mask;
    
    let actionRequired = false;
    let statusLabel = '';
    let timerValue: number | null = null;
    let maxTime = 60; 

    if (isReadyCheck) {
        timerValue = rawReadyTime;
        maxTime = 30; 
        if (me && !me.isReady) {
            actionRequired = true;
            statusLabel = t('game_confirm_ready') || 'Подтвердите готовность';
        } else {
            statusLabel = t('game_waiting_opponent') || 'Ждем соперника';
        }
    } else if (isPlaying) {
        timerValue = rawTurnTime;
        maxTime = (room.turnDuration || 60000) / 1000;
        if (isMyTurn) {
            actionRequired = true;
            statusLabel = t('game_your_turn') || 'Ваш ход';
        } else {
            statusLabel = t('game_opp_turn') || 'Ход соперника';
        }
    } else if (isPauseReq) {
        timerValue = rawTurnTime;
        maxTime = 30;
        if (mask && !room.pauseProposals?.includes(mask)) {
            actionRequired = true;
            statusLabel = t('game_confirm_pause') || 'Подтвердите паузу';
        } else {
            statusLabel = t('game_wait_reply') || 'Ждем ответа';
        }
    } else if (room.status === 'waiting') {
        statusLabel = t('game_waiting_player') || 'Ожидание игрока';
    } else if (room.status === 'paused') {
        statusLabel = t('status_paused') || 'Пауза';
    } else if (room.status === 'finished') {
        actionRequired = true;
        statusLabel = t('status_finished') || 'Матч окончен';
    }

    const progress = (actionRequired && timerValue !== null) 
        ? Math.max(0, Math.min(1, timerValue / maxTime)) 
        : 0;

    const borderClass = actionRequired 
        ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
        : getCardStyle(room);

    const carouselVariants = {
        enter: { x: -20, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: 20, opacity: 0 }
    };

    return (
        <div onClick={onClick} className={`p-3 sm:p-4 rounded-2xl hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center gap-3 sm:gap-4 border-2 ${borderClass} overflow-hidden bg-theme-panel`}>
            
            <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl">
                <PlayerSquare players={room.players} maxPlayers={room.maxPlayers} />
                {actionRequired && timerValue !== null && timerValue > 0 && (
                    <TimerBorder progress={progress} />
                )}
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                <div className="font-bold text-base sm:text-lg text-theme-text truncate w-full">
                    {room.name || "Игровой стол"}
                </div>
                
                <div className="relative h-[22px] w-full mt-0.5 overflow-hidden">
                    <AnimatePresence initial={false}>
                        {!showSettings ? (
                            <motion.div
                                key="status"
                                variants={carouselVariants}
                                initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="absolute inset-0 flex items-center min-w-0"
                            >
                                <span className={`truncate whitespace-nowrap text-[11px] sm:text-xs font-black uppercase tracking-wider ${actionRequired ? 'text-amber-500' : 'text-theme-text opacity-70'}`}>
                                    {actionRequired ? '🔥 ' : ''}{statusLabel}
                                </span>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="settings"
                                variants={carouselVariants}
                                initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="absolute inset-0 flex items-center gap-1.5 overflow-hidden [mask-image:linear-gradient(to_right,#000_85%,transparent)] pr-4"
                            >
                                <span className="bg-theme-main px-2 py-0.5 rounded-md shadow-sm text-[10px] sm:text-xs font-bold text-theme-text opacity-80 shrink-0">
                                    {room.ruleSet === 'classic' ? '🏛️' : '🏡'}
                                </span>
                                {room.isStrict && <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold shrink-0" title={t('rule_strict')}>⚖️</span>}
                                {room.isSuddenDeath && <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold shrink-0" title={t('rule_sudden_death')}>⚡</span>}
                                {room.isPrivate && <span className="bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold shrink-0" title={t('modal_private_table')}>🔒</span>}
                                <span className="bg-theme-main px-2 py-0.5 rounded-md shadow-sm text-[10px] sm:text-xs opacity-70 font-medium shrink-0">
                                    {room.turnDuration === 15000 ? '⚡ 15с' : room.turnDuration === 60000 ? '☕ 60с' : '⏱ 30с'}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-1 z-10">
                <div className="font-black text-lg sm:text-xl text-amber-500 whitespace-nowrap drop-shadow-sm">
                    {room.betAmount} <span className="opacity-80 text-sm">💰</span>
                </div>
                <ChevronRight className="w-5 h-5 text-theme-text opacity-30 shrink-0" />
            </div>
        </div>
    );
};

export function ActiveRoomsList({ rooms, masks, isSurrendering, onSurrender, onOpenRoom }: ActiveRoomsListProps) {
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
                            <ActiveRoomCard room={room} mask={masks[roomId]} onClick={() => onOpenRoom(roomId)} />
                        </SwipeableActionCard>
                    );
                })}
            </div>
        </div>
    );
}