"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fbManager } from '@/lib/supabaseManager'; // 🟢 Убран ErrorTranslations
import { GameRoom, UserProfile, Card, GameState } from '@/types';
import { useAlert } from '@/components/AlertProvider';

function useCountdown(deadline: number | null | undefined) {
    const [timeLeft, setTimeLeft] = useState(0);
    useEffect(() => {
        if (!deadline) { setTimeLeft(0); return; }
        const update = () => setTimeLeft(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [deadline]);
    return timeLeft;
}

const PlayingCard = ({ card, onClick, disabled, isPending, isSelected, isCapturedTarget }: any) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
        <button
            onClick={disabled ? undefined : () => onClick(card)}
            disabled={disabled}
            className={`relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl shadow-md flex flex-col justify-between p-1.5 sm:p-2 font-bold select-none border-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform
            ${isRed ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-900 border-slate-200 bg-white'}
            ${isSelected ? 'ring-4 ring-theme-primary -translate-y-3 z-10' : ''}
            ${isCapturedTarget ? 'ring-4 ring-red-500 border-red-500 scale-110 z-20 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : ''}
            ${disabled && !isSelected && !isCapturedTarget ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2 hover:shadow-xl'}
            ${isPending ? 'opacity-0 scale-50' : 'opacity-100'}`}
        >
            <div className="text-xs sm:text-base md:text-lg leading-none text-left">{card.rank}</div>
            <div className="text-lg sm:text-2xl md:text-3xl text-center self-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{card.suit}</div>
            <div className="text-xs sm:text-base md:text-lg leading-none text-right rotate-180">{card.rank}</div>
        </button>
    );
};

const CardBack = ({ count, label, isAnimating, isEmpty }: any) => {
    if (isEmpty) return (
        <div className="relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl border-4 border-dashed border-theme-border opacity-50 flex flex-col items-center justify-center text-theme-text select-none">
            <span className="text-[10px] sm:text-xs font-bold">Пусто</span>
            {label && <span className="absolute -bottom-5 sm:-bottom-6 text-[10px] sm:text-xs whitespace-nowrap font-bold opacity-70">{label}</span>}
        </div>
    );
    return (
        <div className={`relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.1)] border-4 border-theme-border flex flex-col items-center justify-center text-theme-text font-black select-none transition-all duration-300 ${isAnimating ? 'scale-125 -translate-y-4 ring-4 ring-amber-400 z-10' : ''}`} style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--bg-panel), var(--bg-panel) 10px, var(--bg-main) 10px, var(--bg-main) 20px)' }}>
            <div className="bg-theme-main px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs sm:text-sm md:text-xl border-2 border-theme-border">{count}</div>
            {label && <span className="absolute -bottom-5 sm:-bottom-6 text-[10px] sm:text-xs whitespace-nowrap opacity-70 font-bold">{label}</span>}
        </div>
    );
};

export default function GameRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const { showAlert, showConfirm } = useAlert();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [roomData, setRoomData] = useState<GameRoom | null>(null);
    const [pendingMove, setPendingMove] = useState<{ card: Card, isMe: boolean } | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const isProcessing = useRef(false);

    const shownAlerts = useRef<Set<string>>(new Set());
    const hasAttemptedFetchMask = useRef(false);

    const [selectedTableCards, setSelectedTableCards] = useState<string[]>([]);
    const [myMask, setMyMask] = useState<string | null>(null);

    const [visualGame, setVisualGame] = useState<GameState | null>(null);
    const [animatingAction, setAnimatingAction] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') setMyMask(sessionStorage.getItem(`pasur_mask_${roomId}`));
        let unsubUser: (() => void) | undefined;
        let unsubRoom: (() => void) | undefined;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user;

            if (currentUser) {
                unsubUser = fbManager.subscribeToUser(currentUser.id, (userData) => {
                    if (userData) setUser(userData);
                });

                unsubRoom = fbManager.subscribeToRoomsByIds([roomId], (rooms) => {
                    const data = rooms[0];
                    if (!data) { router.push('/dashboard'); return; }

                    const currentMask = sessionStorage.getItem(`pasur_mask_${roomId}`);
                    const amIInPlayers = data.players.some(p => p.id === currentMask);

                    if (!amIInPlayers && data.status === 'waiting' && currentMask) {
                        sessionStorage.removeItem(`pasur_mask_${roomId}`);
                        setMyMask(null);
                        router.replace('/dashboard');
                        return;
                    }

                    setRoomData(data);

                    if (data.adminMessage && !shownAlerts.current.has(data.adminMessage)) {
                        shownAlerts.current.add(data.adminMessage);
                        const parts = data.adminMessage.split('|');
                        if (parts.length >= 3) {
                            if (parts[0] === 'ALL' || parts[0] === currentMask) showAlert(parts[1]);
                        } else {
                            showAlert(data.adminMessage.split('|')[0]);
                        }
                    }
                });
            } else {
                if (unsubUser) unsubUser();
                if (unsubRoom) unsubRoom();
                router.push('/');
            }
        });

        return () => { subscription.unsubscribe(); if (unsubUser) unsubUser(); if (unsubRoom) unsubRoom(); };
    }, [roomId, router, showAlert]);

    useEffect(() => {
        // 🟢 ИСПОЛЬЗУЕТСЯ НОВЫЙ МЕТОД getMyMask
        if (!myMask && user && roomData && !hasAttemptedFetchMask.current) {
            hasAttemptedFetchMask.current = true;
            fbManager.getMyMask(roomId).then(mask => {
                if (mask) { setMyMask(mask); sessionStorage.setItem(`pasur_mask_${roomId}`, mask); }
            }).catch(console.error);
        }
    }, [user, roomData, myMask, roomId]);

    useEffect(() => {
        const serverGame = roomData?.gameState;
        if (!serverGame) {
            setVisualGame(null);
            setAnimatingAction(null);
            return;
        }

        if (!visualGame || !serverGame.lastAction) {
            setVisualGame(serverGame);
            setPendingMove(null);
            return;
        }

        if (serverGame.lastAction.timestamp > (visualGame.lastAction?.timestamp || 0)) {
            const action = serverGame.lastAction;

            if (action.playerId === safeMyId) {
                setVisualGame(serverGame);
                setPendingMove(null);
            } else {
                setAnimatingAction(action);
                setTimeout(() => {
                    setVisualGame(serverGame);
                    setAnimatingAction(null);
                    setPendingMove(null);
                }, 2000);
            }
        } else if (!animatingAction) {
            setVisualGame(serverGame);
            setPendingMove(null);
        }
    }, [roomData?.gameState]);

    const safeMyId = myMask || user?.uid;
    const isPlayer0 = roomData?.players[0]?.id === safeMyId;

    const turnTimeLeft = useCountdown(roomData?.turnDeadline);
    const readyTimeLeft = useCountdown(roomData?.readyDeadline);

    const isSpectatorSafe = roomData ? !roomData.players.some(p => p.id === safeMyId) : true;
    const isMyTurnSafe = !isSpectatorSafe && roomData?.gameState?.currentTurnIndex === roomData?.gameState?.players.findIndex(p => p.id === safeMyId);

    const claimTimeoutVictory = useCallback(async () => {
        if (isProcessing.current) return;
        isProcessing.current = true;
        try {
            await fbManager.leaveRoom(roomId, 'timeout');
        }
        catch (e: any) { if (!e.message?.includes("ERR_INVALID_MOVE")) console.error(e); }
        finally { setTimeout(() => { isProcessing.current = false; }, 2000); }
    }, [roomId]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let interval: NodeJS.Timeout;

        // Timeout победы только если статус 'playing'
        if (roomData?.status === 'playing' && !isMyTurnSafe && !isSpectatorSafe && turnTimeLeft === 0) {
            const attemptKick = () => { if (!isProcessing.current) claimTimeoutVictory(); };
            timeout = setTimeout(attemptKick, 6000);
            interval = setInterval(attemptKick, 3000);
        }

        // Timeout авто-отклонения паузы
        if (roomData?.status === 'pause_requested' && turnTimeLeft === 0) {
            fbManager.resolvePauseTimeout(roomId);
        }

        return () => { if (timeout) clearTimeout(timeout); if (interval) clearInterval(interval); };
    }, [roomData?.status, isMyTurnSafe, isSpectatorSafe, turnTimeLeft, claimTimeoutVictory, roomId]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let interval: NodeJS.Timeout;
        if ((roomData?.status === 'ready_check' || roomData?.status === 'ready_check_resume') && readyTimeLeft === 0 && isPlayer0) {
            const attemptResolve = () => {
                if (!isProcessing.current) {
                    isProcessing.current = true;
                    fbManager.resolveReadyTimeout(roomId).finally(() => { setTimeout(() => { isProcessing.current = false; }, 2000); });
                }
            };
            timeout = setTimeout(attemptResolve, 1500);
            interval = setInterval(attemptResolve, 3000);
        }
        return () => { if (timeout) clearTimeout(timeout); if (interval) clearInterval(interval); };
    }, [roomData?.status, readyTimeLeft, roomId, isPlayer0]);

    const handleJoinClick = () => {
        setIsJoining(true);
        fbManager.joinRoom(roomId).then((mask) => { if (mask) setMyMask(mask); }).catch(e => showAlert(e.message)).finally(() => setIsJoining(false));
    };

    const handleLeaveOrSurrender = () => {
        // Уходим с потерей ставки если игра в процессе или на паузе
        const isPlaying = roomData?.status === 'playing' || roomData?.status === 'pause_requested' || roomData?.status === 'paused' || roomData?.status === 'ready_check_resume';
        showConfirm(isPlaying ? "Уверены? Вы потеряете ставку!" : "Покинуть стол?", async () => {
            isProcessing.current = true;
            try {
                await fbManager.leaveRoom(roomId, isPlaying ? 'surrender' : 'leave');

                sessionStorage.removeItem(`pasur_mask_${roomId}`);
                setMyMask(null);
                router.replace('/dashboard');
            } catch (e: any) { showAlert(e.message); isProcessing.current = false; }
        });
    };

    const handlePlayerMove = async (card: Card) => {
        if (!roomData || isProcessing.current || animatingAction) return;

        if (selectedTableCards.length > 0 && game) {
            const targets = game.table.filter(c => selectedTableCards.includes(c.id));
            if (card.rank === 'J' && targets.some(c => c.rank === 'Q' || c.rank === 'K')) {
                return showAlert("Валет не может забрать Даму или Короля!");
            }
            if ((card.rank === 'Q' || card.rank === 'K') && (targets.length !== 1 || targets[0].rank !== card.rank)) {
                return showAlert(`Можно взять только одну такую же картинку (${card.rank})!`);
            }
            if (card.rank !== 'J' && card.rank !== 'Q' && card.rank !== 'K' && targets.some(c => c.value === 0)) {
                return showAlert("Нельзя использовать картинки для суммы 11!");
            }
        }

        setPendingMove({ card, isMe: true });
        isProcessing.current = true;

        try {
            // 🟢 ИСПОЛЬЗУЕТСЯ НОВЫЙ МЕТОД playCard
            await fbManager.playCard(roomId, card.id, selectedTableCards);
            setSelectedTableCards([]);
        } catch (e: any) {
            showAlert(e.message);
            setPendingMove(null);
        } finally {
            isProcessing.current = false;
        }
    };

    const toggleTableCardSelection = (cardId: string) => {
        if (!isMyTurnSafe || animatingAction) return;
        setSelectedTableCards(prev => prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]);
    };

    if (!user || !roomData || !safeMyId) return <div className="min-h-screen flex items-center justify-center font-bold">Загрузка...</div>;

    const meLobbyInfo = roomData.players.find(p => p.id === safeMyId);
    const isAnon = (id: string | null | undefined) => id?.startsWith('anon_');
    const renderAvatar = (id: string | null | undefined) => isAnon(id) ? '👤' : '😎';

    // ЭКРАНЫ ЛОББИ И ОЖИДАНИЯ
    if (roomData.status === 'waiting' || roomData.status === 'ready_check' || roomData.status === 'ready_check_resume' || roomData.status === 'paused') {
        const isFull = roomData.players.length === roomData.maxPlayers;
        const isPaused = roomData.status === 'paused';

        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-theme-main">
                {(roomData.status === 'waiting' || isPaused) && (
                    <button onClick={() => router.push('/dashboard')} className="absolute top-6 left-6 opacity-60 hover:opacity-100 transition font-bold text-theme-text">◀ Назад в Лобби</button>
                )}

                <div className="bg-theme-panel p-8 rounded-3xl max-w-md w-full border-4 border-theme-border text-center shadow-2xl">
                    {isPaused && <div className="bg-theme-primary text-white text-xs font-black uppercase tracking-widest py-1 px-3 rounded-full inline-block mb-4 animate-pulse">ИГРА НА ПАУЗЕ</div>}

                    <h2 className="text-3xl font-black mb-2 flex items-center justify-center gap-2 text-theme-text">
                        <span>{renderAvatar(roomData.players[0]?.id)}</span>
                        <span>Стол {roomData.players[0]?.name || "Игрока"}</span>
                    </h2>
                    <p className="mb-6 text-amber-500 font-black text-xl">Ставка: {roomData.betAmount} 💰</p>

                    <div className="space-y-3 mb-6 text-left">
                        {Array.from({ length: roomData.maxPlayers }).map((_, i) => {
                            const p = roomData.players[i];
                            return (
                                <div key={i} className="flex justify-between items-center bg-theme-main p-4 rounded-xl border-2 border-theme-border">
                                    <span className="font-bold text-theme-text">{p ? p.name : <span className="opacity-50 italic">Ожидание игрока...</span>}{p?.id === safeMyId && " (Вы)"}</span>
                                    {p && !isPaused && <span className={`text-sm font-black px-3 py-1 rounded-lg ${p.isReady ? 'bg-theme-primary text-white' : 'bg-theme-panel text-theme-text opacity-60 border-2 border-theme-border'}`}>{p.isReady ? 'ГОТОВ' : 'Думает...'}</span>}
                                </div>
                            );
                        })}
                    </div>

                    {(roomData.status === 'ready_check' || roomData.status === 'ready_check_resume') && (
                        <div className="mb-6 animate-pulse">
                            <div className="text-sm text-theme-primary font-black uppercase tracking-widest mb-1">Игра начинается через</div>
                            <div className="text-6xl font-black text-theme-text">{readyTimeLeft}</div>
                        </div>
                    )}

                    {!isSpectatorSafe ? (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => fbManager.toggleReady(roomId, true).catch(e => showAlert(e.message))}
                                disabled={!isFull || meLobbyInfo?.isReady}
                                className={`w-full py-4 rounded-xl font-black transition-all shadow-lg text-lg text-white border-2 border-transparent ${meLobbyInfo?.isReady ? 'bg-theme-main border-theme-border text-theme-text opacity-70 cursor-not-allowed' : 'bg-theme-primary hover:opacity-80'}`}
                            >
                                {meLobbyInfo?.isReady ? 'ОЖИДАЕМ СОПЕРНИКА...' : (isPaused ? '▶ ПРОДОЛЖИТЬ ИГРУ' : '🔥 Я ГОТОВ')}
                            </button>
                            {(roomData.status !== 'ready_check' && roomData.status !== 'ready_check_resume') && <button onClick={handleLeaveOrSurrender} disabled={isProcessing.current} className="text-red-500 hover:text-red-600 text-sm py-2 font-bold">{isProcessing.current ? "Выходим..." : (isPaused ? "Сдаться" : "Покинуть стол")}</button>}
                        </div>
                    ) : (
                        <button onClick={handleJoinClick} disabled={isJoining || isFull} className="w-full bg-theme-primary text-white hover:opacity-80 py-4 rounded-xl font-black disabled:opacity-50 transition-colors">{isFull ? 'Стол заполнен' : (isJoining ? 'Садимся...' : 'Сесть за стол')}</button>
                    )}
                </div>
            </div>
        );
    }

    const game = visualGame;
    if (!game) return null;

    const me = game.players.find(p => p.id === safeMyId) || game.players[0];
    const opponent = game.players.find(p => p.teamId !== me.teamId);
    if (!opponent) return null;

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-theme-main overflow-hidden p-2 sm:p-4 gap-2">

            {/* ТОП-БАР */}
            <div className="flex-shrink-0 w-full max-w-4xl mx-auto bg-theme-panel border-4 border-theme-border p-3 sm:p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="font-mono font-black text-sm sm:text-xl text-theme-text">
                    <span className="opacity-70 text-[10px] sm:text-sm mr-1 sm:mr-2">{isSpectatorSafe ? "ИГРОК 1" : "ВЫ"}</span>
                    <span className="text-theme-primary">{game.matchScores[me.teamId] || 0}</span>
                    <span className="mx-1 sm:mx-2 opacity-50">:</span>
                    <span className="text-blue-500">{game.matchScores[opponent.teamId] || 0}</span>
                    <span className="opacity-70 text-[10px] sm:text-sm ml-1 sm:ml-2">{isSpectatorSafe ? "ИГРОК 2" : "ОПП"}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    {!isSpectatorSafe && (
                        <>
                            <div className={`px-2 py-1 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black ${isMyTurnSafe ? 'bg-amber-500 text-white shadow-md' : 'bg-theme-main border-2 border-theme-border text-theme-text opacity-70'}`}>
                                {isMyTurnSafe ? 'ВАШ ХОД' : 'ЖДЕМ...'} ({turnTimeLeft}с)
                            </div>
                            {!isMyTurnSafe && turnTimeLeft === 0 && roomData.status === 'playing' && (
                                <div className="bg-red-500 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black shadow-lg animate-pulse">Время вышло!</div>
                            )}
                        </>
                    )}
                    <button onClick={isSpectatorSafe ? () => router.push('/dashboard') : handleLeaveOrSurrender} className="bg-theme-main border-2 border-theme-border px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 text-theme-text font-bold transition-colors">
                        {isSpectatorSafe ? "Выйти" : (roomData.status === 'finished' ? "Уйти" : "Сдаться")}
                    </button>
                </div>
            </div>

            {/* ВЕРХНИЙ ИГРОК */}
            <div className={`flex-shrink-0 w-full max-w-4xl mx-auto p-2 sm:p-4 rounded-2xl flex justify-between items-center transition-all duration-300 border-4 ${!isMyTurnSafe && roomData.status === 'playing' ? 'bg-theme-main border-blue-500 shadow-[0_10px_20px_rgba(59,130,246,0.1)]' : 'bg-theme-panel/50 border-theme-border'}`}>
                <div className="flex flex-col items-center gap-1 w-14 sm:w-24">
                    <CardBack count={opponent.captured.length || 0} label="Взятки" isEmpty={!opponent.captured.length} />
                </div>
                <div className="flex-1 flex flex-col items-center">
                    <div className="text-xs sm:text-sm mb-1 sm:mb-2 font-black flex items-center gap-2 text-theme-text">
                        <span className={!isMyTurnSafe && roomData.status === 'playing' ? 'animate-bounce' : 'opacity-80'}>
                            {renderAvatar(opponent.id)}
                        </span>
                        <span className={!isMyTurnSafe && roomData.status === 'playing' ? 'text-blue-500' : 'opacity-80'}>
                            {roomData.players.find(p => p.id === opponent.id)?.name || "Оппонент"}
                        </span>
                        {!isMyTurnSafe && roomData.status === 'playing' && (
                            <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full ml-2 animate-pulse">⏳ Ходит</span>
                        )}
                    </div>
                    <div className="flex justify-center -space-x-6 sm:-space-x-8 md:-space-x-12">
                        {opponent.hand.map((_, i) => <div key={i} className={`w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl border-4 border-theme-border shadow-md transition-transform ${!isMyTurnSafe && roomData.status === 'playing' ? 'hover:-translate-y-2' : ''}`} style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--bg-panel), var(--bg-panel) 10px, var(--bg-main) 10px, var(--bg-main) 20px)' }}></div>)}
                    </div>
                </div>
                <div className="flex flex-col items-center gap-1 w-14 sm:w-24">
                    <div className={`h-20 w-14 sm:h-24 sm:w-16 md:h-28 md:w-20 relative flex items-center justify-center border-2 border-dashed rounded-xl transition-colors ${!isMyTurnSafe && roomData.status === 'playing' ? 'border-blue-500/50 bg-blue-500/5' : 'border-theme-border/30'}`}>
                        {animatingAction && animatingAction.playerId === opponent.id && (
                            <div className="absolute animate-in slide-in-from-top-10 fade-in zoom-in duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-50">
                                <PlayingCard card={animatingAction.playedCard} disabled={true} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ИГРОВОЙ СТОЛ */}
            <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto border-4 border-theme-border rounded-[2rem] sm:rounded-[3rem] bg-theme-panel shadow-inner overflow-auto p-4 sm:p-6">
                {game.table.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center opacity-40 text-lg sm:text-2xl font-black uppercase tracking-widest text-theme-text">
                        Стол пуст
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 sm:gap-4 justify-center items-center min-h-full">
                        {game.table.map(card => {
                            const isCapturedByOpponent = animatingAction?.capturedCards.some((c: Card) => c.id === card.id);
                            return (
                                <PlayingCard
                                    key={card.id}
                                    card={card}
                                    disabled={!isMyTurnSafe || isSpectatorSafe || !!animatingAction}
                                    isSelected={selectedTableCards.includes(card.id)}
                                    isCapturedTarget={isCapturedByOpponent}
                                    onClick={() => toggleTableCardSelection(card.id)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* НИЖНИЙ ИГРОК */}
            {!isSpectatorSafe && (
                <div className={`flex-shrink-0 w-full max-w-4xl mx-auto p-2 sm:p-4 rounded-[2rem] flex justify-between items-center transition-all duration-300 border-4 ${isMyTurnSafe ? 'bg-theme-main border-theme-primary shadow-[0_-10px_20px_rgba(0,0,0,0.05)]' : 'bg-theme-panel border-theme-border'}`}>
                    <div className="flex flex-col items-center gap-1 w-14 sm:w-24">
                        <CardBack count={me.captured.length || 0} label="Взятки" isEmpty={!me.captured.length} />
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                        <div className="flex justify-between w-full max-w-[250px] sm:max-w-[300px] text-[10px] sm:text-sm mb-2 sm:mb-3">
                            <span className="font-black text-theme-primary flex items-center gap-1 sm:gap-2 text-xs sm:text-lg"><span>{user.avatarEmoji || '😎'}</span> Вы</span>
                            <span className="opacity-80 font-mono font-black text-xs sm:text-lg text-theme-text">Суры: {me.surs || 0}</span>
                        </div>
                        <div className="flex justify-center -space-x-2 sm:space-x-2">
                            {me.hand.map(card => <PlayingCard key={card.id} card={card} onClick={handlePlayerMove} disabled={!isMyTurnSafe || isProcessing.current || game.isRoundOver || !!animatingAction} isPending={pendingMove?.card.id === card.id} />)}
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 w-14 sm:w-24">
                        <div className="h-20 w-14 sm:h-24 sm:w-16 md:h-28 md:w-20 relative flex items-center justify-center">
                            {game.dealerReservedJacks && game.dealerReservedJacks.length > 0 ? (
                                <div className="relative">
                                    <PlayingCard card={game.dealerReservedJacks[0]} disabled={true} />
                                    {game.dealerReservedJacks.length > 1 && (
                                        <div className="absolute -top-2 -right-2 bg-theme-primary text-white text-[10px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-theme-panel z-30">
                                            {game.dealerReservedJacks.length}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <CardBack count={game.deckCount ?? game.deck?.length ?? 0} label="Колода" isEmpty={(game.deckCount ?? game.deck?.length ?? 0) === 0} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 МОДАЛКА ОКОНЧАНИЯ МАТЧА ИЛИ РАУНДА */}
            {(game.isRoundOver || game.isMatchOver) && !isSpectatorSafe && !animatingAction && roomData.status !== 'pause_requested' && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-theme-panel p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center border-4 border-theme-border shadow-2xl animate-in zoom-in-95 duration-300">
                        {game.isMatchOver ? (
                            <>
                                <h2 className="text-3xl sm:text-4xl font-black mb-2 text-theme-primary tracking-wider">{game.matchWinnerTeamId === me.teamId ? "ПОБЕДА!" : "ПОРАЖЕНИЕ"}</h2>
                                <p className="opacity-70 mb-6 font-bold">Счет: {game.matchScores[me.teamId]} - {game.matchScores[opponent.teamId]}</p>

                                {meLobbyInfo?.isReady ? (
                                    <div className="w-full mt-4 bg-theme-main border-2 border-theme-border text-theme-text py-4 rounded-xl font-black opacity-70">Ожидаем соперника...</div>
                                ) : (
                                    <div className="flex flex-col gap-3 mt-4">
                                        <button onClick={() => fbManager.rematch(roomId)} className="w-full bg-theme-primary text-white py-4 rounded-xl font-black shadow-lg">🔄 Реванш ({roomData.betAmount} 💰)</button>
                                        <button onClick={handleLeaveOrSurrender} className="w-full bg-theme-main border-2 border-theme-border text-theme-text py-4 rounded-xl font-black hover:bg-theme-border transition-colors">Вернуться в лобби</button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl sm:text-3xl font-black mb-2 text-theme-text">Раунд {game.roundNumber} завершен</h2>
                                <p className="text-theme-primary mb-6 font-mono font-black text-2xl">Счет: {game.matchScores[me.teamId]} - {game.matchScores[opponent.teamId]}</p>
                                <div className="flex flex-col gap-3">
                                    {isPlayer0 ? <button onClick={() => fbManager.nextRound(roomId).catch(e => showAlert(e.message))} className="w-full bg-theme-primary text-white py-3 sm:py-4 rounded-xl font-black shadow-lg">Раздать карты</button> : <div className="opacity-70 font-black py-2 text-theme-text">Ожидаем раздачу...</div>}
                                    
                                    {/* Кнопка запроса паузы доступна только если раунд окончен, но матч еще нет */}
                                    {roomData.status === 'playing' && (
                                        <button onClick={() => fbManager.proposePause(roomId)} className="w-full bg-theme-main border-2 border-theme-border text-theme-text py-3 rounded-xl font-bold hover:bg-theme-border transition-colors mt-2">
                                            ⏸ Отложить игру (Пауза)
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 🟢 МОДАЛКА: ЗАПРОС НА ПАУЗУ */}
            {roomData.status === 'pause_requested' && !isSpectatorSafe && (
                <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-theme-panel p-8 rounded-3xl max-w-sm w-full text-center border-4 border-theme-border shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black mb-4">Запрос на паузу ⏱️</h2>
                        {roomData.pauseProposals?.includes(safeMyId) ? (
                            <p className="opacity-80 mb-4 font-bold">Ожидаем ответа соперника... ({turnTimeLeft}с)</p>
                        ) : (
                            <>
                                <p className="opacity-80 mb-6 font-bold">Оппонент хочет отложить игру. Согласны? ({turnTimeLeft}с)</p>
                                <div className="flex gap-3">
                                    <button onClick={() => fbManager.answerPauseRequest(roomId, false)} className="flex-1 bg-theme-main border-2 border-theme-border py-3 rounded-xl font-bold hover:bg-theme-border transition-colors">Продолжить</button>
                                    <button onClick={() => fbManager.answerPauseRequest(roomId, true)} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-amber-600 transition-colors">Согласиться</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}