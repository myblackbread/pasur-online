"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { RoomDTO } from "@/shared/api/contracts/dto";
import { GAME_CONFIG, UI_CONFIG } from "@/shared/config/constants";
import { useCountdown } from "@/shared/lib/hooks/useCountdown";
import { TimerBorder } from "@/shared/ui/animations/TimerBorder";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

// Вынесли зависимость от комнаты, передаем только ставку
const getCardStyle = (betAmount: number) => {
    if (betAmount >= 5000) return 'border-purple-500/40 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.1)]';
    if (betAmount >= 1000) return 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    return 'border-theme-border/30 bg-theme-panel shadow-sm';
};

export const ActiveRoomCard = ({
    room,
    mask,
    onClick,
    playerSlot
}: {
    room: RoomDTO,
    mask?: string,
    onClick: () => void,
    playerSlot: React.ReactNode
}) => {
    const { t } = useTranslation();
    const [showSettings, setShowSettings] = React.useState(false);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setShowSettings(prev => !prev);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    // 1. Базовые статусы из новой модели DTO
    const isWaiting = room.status === 'waiting';
    const isPlaying = room.status === 'playing';
    const isPaused = room.status === 'paused';
    const isFinished = room.status === 'finished';

    // 2. Единый таймер из activeDeadline
    const rawActiveTime = useCountdown(room.activeDeadline);

    // 3. Вычисляемые параметры игрока
    const lobbyMe = room.players.find(p => p.id === mask);
    const isMyTurn = isPlaying && room.publicGameState?.players?.[room.publicGameState.currentTurnIndex]?.id === mask;
    const isPrivate = !!room.joinCode;

    let actionRequired = false;
    let statusLabel = '';
    let timerValue: number | null = null;
    let maxTime = 60;

    // 4. Логика назначения лейблов и прогресс-баров
    if (isWaiting) {
        if (room.activeDeadline) {
            timerValue = rawActiveTime;
            maxTime = GAME_CONFIG.DEFAULT_READY_DURATION / 1000; // 30 сек
            if (lobbyMe && !lobbyMe.isReady) {
                actionRequired = true;
                statusLabel = t('game_confirm_ready') || 'Подтвердите готовность';
            } else {
                statusLabel = t('game_waiting_opponent') || 'Ждем соперника';
            }
        } else {
            statusLabel = t('game_waiting_player') || 'Ожидание игрока';
        }
    } else if (isPlaying) {
        timerValue = rawActiveTime;
        maxTime = (room.turnDuration || GAME_CONFIG.DEFAULT_TURN_DURATION) / 1000;
        if (isMyTurn) {
            actionRequired = true;
            statusLabel = t('game_your_turn') || 'Ваш ход';
        } else {
            statusLabel = t('game_opp_turn') || 'Ход соперника';
        }
    } else if (isPaused) {
        // Пауза теперь тоже требует "готовности" для продолжения игры
        if (room.activeDeadline) {
            timerValue = rawActiveTime;
            maxTime = GAME_CONFIG.DEFAULT_READY_DURATION / 1000;
            if (lobbyMe && !lobbyMe.isReady) {
                actionRequired = true;
                statusLabel = t('game_confirm_ready') || 'Подтвердите готовность';
            } else {
                statusLabel = t('game_wait_reply') || 'Ждем ответа';
            }
        } else {
            statusLabel = t('status_paused') || 'Пауза';
        }
    } else if (isFinished) {
        actionRequired = true;
        statusLabel = t('status_finished') || 'Матч окончен';
    }

    const progress = (actionRequired && timerValue !== null && maxTime > 0)
        ? Math.max(0, Math.min(1, timerValue / maxTime))
        : 0;

    const borderClass = actionRequired
        ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
        : getCardStyle(room.betAmount);

    const carouselVariants = {
        enter: { x: -20, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: 20, opacity: 0 }
    };

    // 5. Безопасное получение иконки скорости из UI конфига
    const speedUI = UI_CONFIG.SPEED_UI[room.turnDuration as keyof typeof UI_CONFIG.SPEED_UI] || UI_CONFIG.SPEED_UI[60000];
    const speedLabel = room.turnDuration === 3600000 ? '1ч' : `${room.turnDuration / 1000}с`;

    return (
        <div onClick={onClick} className={`p-3 sm:p-4 rounded-2xl hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center gap-3 sm:gap-4 border-2 ${borderClass} overflow-hidden bg-theme-panel`}>

            <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl">
                {playerSlot}
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
                                {isPrivate && <span className="bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold shrink-0" title={t('modal_private_table')}>🔒</span>}
                                <span className="bg-theme-main px-2 py-0.5 rounded-md shadow-sm text-[10px] sm:text-xs opacity-70 font-medium shrink-0">
                                   {speedUI.icon} {speedLabel}
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