"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { gameApi, realtimeApi } from '@/lib/supabase';
import { GameRoom, UserProfile, Card, GameState, PlayerState } from '@/types';
import { useAlert } from '@/components/providers/AlertProvider';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';

import { useCountdown } from '@/features/game/hooks/useCountdown';
import { PlayingCard } from '@/features/game/components/PlayingCard';

export default function GameRoomPage() {
    const { t } = useTranslation();
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
    const [allActiveRooms, setAllActiveRooms] = useState<GameRoom[]>([]);

    const [animationState, setAnimationState] = useState<{
        phase: 'idle' | 'playing' | 'gathering' | 'flying';
        action: any | null;
    }>({ phase: 'idle', action: null });
    const isAnimatingRef = useRef(false);
    const lastProcessedTimestamp = useRef<number>(0);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedAlerts = sessionStorage.getItem(`pasur_alerts_${roomId}`);
            if (savedAlerts) {
                try { shownAlerts.current = new Set(JSON.parse(savedAlerts)); } catch (e) { }
            }
        }
    }, [roomId]);

    useEffect(() => {
        if (typeof window !== 'undefined') setMyMask(sessionStorage.getItem(`pasur_mask_${roomId}`));
        let unsubUser: (() => void) | undefined;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user;
            if (currentUser) {
                unsubUser = realtimeApi.subscribeToUser(currentUser.id, (userData) => {
                    if (userData) setUser(userData);
                });
            } else {
                if (unsubUser) unsubUser();
                router.push('/');
            }
        });

        return () => { subscription.unsubscribe(); if (unsubUser) unsubUser(); };
    }, [roomId, router]);

    useEffect(() => {
        if (!user) return;
        const roomsToFetch = Array.from(new Set([roomId, ...(user.activeRooms || [])]));
        const unsubRoom = realtimeApi.subscribeToRoomsByIds(roomsToFetch, (rooms) => {
            setAllActiveRooms(rooms);
            const data = rooms.find(r => r.id === roomId);
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
                if (typeof window !== 'undefined') sessionStorage.setItem(`pasur_alerts_${roomId}`, JSON.stringify(Array.from(shownAlerts.current)));
                const parts = data.adminMessage.split('|');
                if (parts.length >= 3) {
                    if (parts[0] === 'ALL' || parts[0] === currentMask) showAlert(t(parts[1]));
                } else {
                    showAlert(t(data.adminMessage.split('|')[0]));
                }
            }
        });
        return () => unsubRoom();
    }, [user?.activeRooms, roomId, router, showAlert, t]);

    useEffect(() => {
        if (!myMask && user && roomData && !hasAttemptedFetchMask.current) {
            hasAttemptedFetchMask.current = true;
            gameApi.getMyMask(roomId).then(mask => {
                if (mask) { setMyMask(mask); sessionStorage.setItem(`pasur_mask_${roomId}`, mask); }
            }).catch(console.error);
        }
    }, [user, roomData, myMask, roomId]);

    useEffect(() => {
        const serverGame = roomData?.gameState;
        if (!serverGame) {
            setVisualGame(null);
            setAnimationState({ phase: 'idle', action: null });
            isAnimatingRef.current = false;
            return;
        }

        if (!serverGame.lastAction || serverGame.lastAction.timestamp <= lastProcessedTimestamp.current) {
            if (!isAnimatingRef.current) {
                setVisualGame(serverGame);
                setAnimationState({ phase: 'idle', action: null });
            }
            return;
        }

        const action = serverGame.lastAction;
        lastProcessedTimestamp.current = action.timestamp;

        isAnimatingRef.current = true;
        let isCancelled = false;
        const timeouts: NodeJS.Timeout[] = [];

        const isCapture = action.capturedCards && action.capturedCards.length > 0;

        setAnimationState({ phase: 'playing', action });
        setVisualGame(prev => {
            if (!prev) return serverGame;
            const next = JSON.parse(JSON.stringify(prev));
            const player = next.players.find((p: any) => p.id === action.playerId);
            if (player) {
                player.hand = player.hand.filter((c: any) => c.id !== action.playedCard.id);
            }
            if (!next.table.some((c: any) => c.id === action.playedCard.id)) {
                next.table.push(action.playedCard);
            }
            return next;
        });

        timeouts.push(setTimeout(() => {
            if (isCancelled) return;

            if (isCapture) {
                setAnimationState({ phase: 'gathering', action });

                timeouts.push(setTimeout(() => {
                    if (isCancelled) return;

                    setAnimationState({ phase: 'flying', action });
                    setVisualGame(prev => {
                        if (!prev) return serverGame;
                        const next = JSON.parse(JSON.stringify(prev));
                        const capturedIds = [action.playedCard.id, ...action.capturedCards.map((c: any) => c.id)];
                        next.table = next.table.filter((c: any) => !capturedIds.includes(c.id));
                        return next;
                    });

                    timeouts.push(setTimeout(() => {
                        if (isCancelled) return;

                        isAnimatingRef.current = false;
                        setAnimationState({ phase: 'idle', action: null });
                        setVisualGame(serverGame);
                        setPendingMove(null);
                    }, 600));
                }, 1000));
            } else {
                isAnimatingRef.current = false;
                setAnimationState({ phase: 'idle', action: null });
                setVisualGame(serverGame);
                setPendingMove(null);
            }
        }, 500));

        return () => {
            isCancelled = true;
            timeouts.forEach(clearTimeout);
            isAnimatingRef.current = false;
        };
    }, [roomData?.gameState]);

    const safeMyId = myMask || user?.uid;
    const isPlayer0 = roomData?.players[0]?.id === safeMyId;
    const dealerId = roomData?.players[0]?.id;

    const rawTurnTimeLeft = useCountdown(roomData?.turnDeadline);
    const turnDurationSec = Math.floor((roomData?.turnDuration || 60000) / 1000);
    const turnTimeLeft = Math.min(rawTurnTimeLeft, turnDurationSec);

    const readyTimeLeft = useCountdown(roomData?.readyDeadline);

    const isSpectatorSafe = roomData ? !roomData.players.some(p => p.id === safeMyId) : true;
    const isMyTurnSafe = !isSpectatorSafe && roomData?.gameState?.currentTurnIndex === roomData?.gameState?.players.findIndex(p => p.id === safeMyId);

    const otherRooms = allActiveRooms.filter(r => r.id !== roomId && r.status !== 'finished');

    const claimTimeoutVictory = useCallback(async () => {
        if (isProcessing.current) return;
        isProcessing.current = true;
        try { await gameApi.leaveRoom(roomId, 'timeout'); }
        catch (e: any) { if (!e.message?.includes("ERR_INVALID_MOVE")) console.error(e); }
        finally { setTimeout(() => { isProcessing.current = false; }, 2000); }
    }, [roomId]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let interval: NodeJS.Timeout;

        if (roomData?.status === 'playing' && !isMyTurnSafe && !isSpectatorSafe && rawTurnTimeLeft === 0) {
            const attemptKick = () => { if (!isProcessing.current) claimTimeoutVictory(); };
            timeout = setTimeout(attemptKick, 6000);
            interval = setInterval(attemptKick, 3000);
        }

        if (roomData?.status === 'pause_requested' && rawTurnTimeLeft === 0) {
            gameApi.resolvePauseTimeout(roomId);
        }
        return () => { if (timeout) clearTimeout(timeout); if (interval) clearInterval(interval); };
    }, [roomData?.status, isMyTurnSafe, isSpectatorSafe, rawTurnTimeLeft, claimTimeoutVictory, roomId]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let interval: NodeJS.Timeout;
        if ((roomData?.status === 'ready_check' || roomData?.status === 'ready_check_resume') && readyTimeLeft === 0) {
            const attemptResolve = () => {
                if (!isProcessing.current) {
                    isProcessing.current = true;
                    gameApi.resolveReadyTimeout(roomId).finally(() => { setTimeout(() => { isProcessing.current = false; }, 2000); });
                }
            };
            timeout = setTimeout(attemptResolve, 1500);
            interval = setInterval(attemptResolve, 3000);
        }
        return () => { if (timeout) clearTimeout(timeout); if (interval) clearInterval(interval); };
    }, [roomData?.status, readyTimeLeft, roomId]);

    const handleJoinClick = () => {
        setIsJoining(true);
        gameApi.joinRoom(roomId).then((mask) => { if (mask) setMyMask(mask); }).catch(e => showAlert(t(e.message))).finally(() => setIsJoining(false));
    };

    const handleLeaveOrSurrender = () => {
        const isPlaying = roomData?.status === 'playing' || roomData?.status === 'pause_requested' || roomData?.status === 'paused' || roomData?.status === 'ready_check_resume';
        showConfirm(isPlaying ? t('game_surrender_confirm') : t('game_leave_table'), async () => {
            isProcessing.current = true;
            try {
                await gameApi.leaveRoom(roomId, isPlaying ? 'surrender' : 'leave');
                sessionStorage.removeItem(`pasur_mask_${roomId}`);
                setMyMask(null);
                router.replace('/dashboard');
            } catch (e: any) { showAlert(t(e.message)); isProcessing.current = false; }
        });
    };

    const handlePlayerMove = async (card: Card) => {
        if (!roomData || isProcessing.current || animationState.phase !== 'idle') return;

        if (selectedTableCards.length > 0 && visualGame) {
            const targets = visualGame.table.filter(c => selectedTableCards.includes(c.id));
            if (card.rank === 'J' && targets.some(c => c.rank === 'Q' || c.rank === 'K')) return showAlert(t('game_err_jack'));
            if ((card.rank === 'Q' || card.rank === 'K') && (targets.length !== 1 || targets[0].rank !== card.rank)) return showAlert(t('game_err_picture'));
            if (card.rank !== 'J' && card.rank !== 'Q' && card.rank !== 'K' && targets.some(c => c.value === 0)) return showAlert(t('game_err_sum11'));
        }

        setPendingMove({ card, isMe: true });
        isProcessing.current = true;

        try {
            await gameApi.playCard(roomId, card.id, selectedTableCards);
            setSelectedTableCards([]);
        } catch (e: any) {
            showAlert(t(e.message));
            setPendingMove(null);
        } finally {
            isProcessing.current = false;
        }
    };

    const toggleTableCardSelection = (cardId: string) => {
        if (!isMyTurnSafe || animationState.phase !== 'idle') return;
        setSelectedTableCards(prev => prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]);
    };

    if (!user || !roomData || !safeMyId) return <div className="h-full flex items-center justify-center font-bold">{t('game_loading')}</div>;

    const meLobbyInfo = roomData.players.find(p => p.id === safeMyId);
    const isAnon = (id: string | null | undefined) => id?.startsWith('anon_');
    const renderAvatar = (id: string | null | undefined) => {
        if (id === safeMyId) return user.avatarEmoji || '😎';
        return isAnon(id) ? '👤' : '😎';
    };

    const renderPlayerHub = (player: PlayerState, isMe: boolean, isTurn: boolean) => {
        const captureCount = player.captured.length;
        const hasCaptures = captureCount > 0;
        const hasSurs = visualGame?.ruleSet === 'classic' && player.surs > 0;

        return (
            <div className="relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28">

                <div className={`absolute inset-0 rounded-xl border-4 flex flex-col overflow-hidden select-none transition-all duration-300
                    ${isTurn ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105' : 'border-theme-border shadow-md'}
                    ${!hasCaptures && !isTurn ? 'bg-theme-panel/50 opacity-80' : 'bg-theme-main'}
                `}>

                    {hasSurs && (
                        <div className="w-full bg-purple-500 text-white text-[10px] sm:text-xs font-black py-0.5 flex items-center justify-center gap-1 shadow-sm shrink-0">
                            ⭐ {player.surs}
                        </div>
                    )}

                    <div className="flex-1 flex items-center justify-center relative">
                        <span className={`text-2xl sm:text-3xl md:text-4xl transition-transform duration-300 ${isTurn ? 'animate-bounce' : ''}`}>
                            {renderAvatar(player.id)}
                        </span>
                    </div>

                    {hasCaptures && (
                        <div className="w-full bg-theme-primary text-white text-[10px] sm:text-xs md:text-sm font-black py-0.5 sm:py-1 flex items-center justify-center shadow-inner shrink-0">
                            {captureCount}
                        </div>
                    )}
                </div>

                {animationState.phase === 'flying' && animationState.action?.playerId === player.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[9999]">
                        <div className="absolute"><PlayingCard card={animationState.action.playedCard} disabled /></div>
                        {animationState.action.capturedCards.map((c: Card) => (
                            <div className="absolute" key={c.id}><PlayingCard card={c} disabled /></div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderDeckArea = (currentGame: GameState) => {
        const deckCount = currentGame.deckCount ?? currentGame.deck?.length ?? 0;
        const hasCards = deckCount > 0;
        const jacks = currentGame.dealerReservedJacks || [];

        if (jacks.length > 0) {
            return (
                <div className="relative">
                    <PlayingCard card={jacks[0]} disabled={true} />
                    {jacks.length > 1 && (
                        <div className="absolute -top-2 -right-2 bg-theme-primary text-white text-[10px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-theme-panel z-30">
                            {jacks.length}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28">
                <div className={`absolute inset-0 rounded-xl border-4 flex flex-col overflow-hidden select-none transition-all duration-300 shadow-md ${hasCards ? 'border-theme-border bg-theme-main' : 'border-dashed border-theme-border opacity-40 bg-theme-panel/50'}`}>

                    <div
                        className="flex-1 flex items-center justify-center"
                        style={hasCards ? { backgroundImage: 'repeating-linear-gradient(45deg, var(--bg-panel), var(--bg-panel) 10px, transparent 10px, transparent 20px)' } : {}}
                    >
                        {!hasCards && <span className="text-[10px] sm:text-xs font-bold text-theme-text opacity-50 px-1 text-center">{t('game_empty')}</span>}
                    </div>

                    {hasCards && (
                        <div className="w-full bg-theme-panel border-t-2 border-theme-border text-theme-text text-[10px] sm:text-xs md:text-sm font-black py-0.5 sm:py-1 flex items-center justify-center shadow-inner shrink-0">
                            {deckCount}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (roomData.status === 'waiting' || roomData.status === 'ready_check' || roomData.status === 'ready_check_resume' || roomData.status === 'paused') {
        const isFull = roomData.players.length === roomData.maxPlayers;
        const isPaused = roomData.status === 'paused';

        return (
            <main className="fixed inset-0 w-full h-full flex flex-col bg-theme-main safe-padding overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center relative">
                    {(roomData.status === 'waiting' || isPaused) && (
                        <button onClick={() => router.push('/dashboard')} className="absolute top-4 left-4 sm:top-8 sm:left-8 opacity-60 hover:opacity-100 transition font-bold text-theme-text z-10">
                            {t('game_back_lobby')}
                        </button>
                    )}

                    <div className="bg-theme-panel p-6 sm:p-8 rounded-3xl max-w-md w-full border-4 border-theme-border text-center shadow-2xl relative my-auto">
                        {isPaused && <div className="bg-theme-primary text-white text-xs font-black uppercase tracking-widest py-1 px-3 rounded-full inline-block mb-4 animate-pulse">{t('game_paused_banner')}</div>}

                        <h2 className="text-3xl font-black mb-2 flex items-center justify-center gap-2 text-theme-text">
                            <span>{renderAvatar(roomData.players[0]?.id)}</span>
                            <span>{t('game_table')} {roomData.players[0]?.name === '__INCOGNITO__' ? t('unknown_player') : (roomData.players[0]?.name || t('game_player'))}</span>
                        </h2>
                        <p className="mb-2 text-amber-500 font-black text-xl">{t('game_bet')} {roomData.betAmount} 💰</p>

                        <div className="text-xs opacity-70 font-medium mb-6">
                            {roomData.ruleSet === 'classic' ? t('rule_classic') : t('rule_local')}
                            {roomData.isStrict && <span className="ml-2 text-red-500 font-black">{t('rule_strict')}</span>}
                            {roomData.isSuddenDeath && <span className="ml-2 text-amber-500 font-black">{t('rule_sudden_death')} ⚡</span>}
                        </div>

                        <div className="space-y-3 mb-6 text-left">
                            {Array.from({ length: roomData.maxPlayers }).map((_, i) => {
                                const p = roomData.players[i];
                                return (
                                    <div key={i} className="flex justify-between items-center bg-theme-main p-4 rounded-xl border-2 border-theme-border">
                                        <span className="font-bold text-theme-text">{p ? (p.name === '__INCOGNITO__' ? t('unknown_player') : p.name) : <span className="opacity-50 italic">{t('game_waiting_player')}</span>}{p?.id === safeMyId && t('game_you_suffix')}</span>
                                        {p && !isPaused && <span className={`text-sm font-black px-3 py-1 rounded-lg ${p.isReady ? 'bg-theme-primary text-white' : 'bg-theme-panel text-theme-text opacity-60 border-2 border-theme-border'}`}>{p.isReady ? t('game_ready') : t('game_thinking')}</span>}
                                    </div>
                                );
                            })}
                        </div>

                        {(roomData.status === 'ready_check' || roomData.status === 'ready_check_resume') && (
                            <div className="mb-6 animate-pulse">
                                <div className="text-sm text-theme-primary font-black uppercase tracking-widest mb-1">{t('game_starts_in')}</div>
                                <div className="text-6xl font-black text-theme-text">{readyTimeLeft}</div>
                            </div>
                        )}

                        {!isSpectatorSafe ? (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => gameApi.toggleReady(roomId, true).catch(e => showAlert(t(e.message)))}
                                    disabled={!isFull || meLobbyInfo?.isReady}
                                    className={`w-full py-4 rounded-xl font-black transition-all shadow-lg text-lg text-white border-2 border-transparent ${meLobbyInfo?.isReady ? 'bg-theme-main border-theme-border text-theme-text opacity-70 cursor-not-allowed' : 'bg-theme-primary hover:opacity-80'}`}
                                >
                                    {meLobbyInfo?.isReady ? t('game_waiting_opponent') : (isPaused ? t('game_resume') : t('game_i_am_ready'))}
                                </button>
                                {(roomData.status !== 'ready_check' && roomData.status !== 'ready_check_resume') && <button onClick={handleLeaveOrSurrender} disabled={isProcessing.current} className="text-red-500 hover:text-red-600 text-sm py-2 font-bold">{isProcessing.current ? t('game_leaving') : (isPaused ? t('btn_surrender') : t('game_leave_table'))}</button>}
                            </div>
                        ) : (
                            <button onClick={handleJoinClick} disabled={isJoining || isFull} className="w-full bg-theme-primary text-white hover:opacity-80 py-4 rounded-xl font-black disabled:opacity-50 transition-colors">{isFull ? t('game_table_full') : (isJoining ? t('game_sitting') : t('game_sit_table'))}</button>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    const game = visualGame;
    if (!game) return null;

    const me = game.players.find(p => p.id === safeMyId) || game.players[0];
    const opponent = game.players.find(p => p.teamId !== me.teamId);
    if (!opponent) return null;

    const oppIsTurn = !isMyTurnSafe && roomData.status === 'playing';

    return (
        // Убрали overflow-hidden из внутреннего контейнера
        <main className="fixed inset-0 w-full h-full flex flex-col bg-theme-main overflow-hidden safe-padding">
            <div className="flex-1 w-full h-full max-w-5xl mx-auto flex flex-col p-2 sm:p-4 gap-2 sm:gap-4">

                {/* ТОП-БАР */}
                <div className="flex-none w-full bg-theme-panel p-2 sm:p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div className="font-mono font-black text-xs sm:text-xl text-theme-text flex items-center">
                        <span className="opacity-70 text-[10px] sm:text-sm mr-1 sm:mr-2">{isSpectatorSafe ? t('game_player_1') : t('game_you')}</span>
                        <span className="text-theme-primary">{game.matchScores[me.teamId] || 0}</span>
                        <span className="mx-1 sm:mx-2 opacity-50">:</span>
                        <span className="text-blue-500">{game.matchScores[opponent.teamId] || 0}</span>
                        <span className="opacity-70 text-[10px] sm:text-sm ml-1 sm:ml-2">{isSpectatorSafe ? t('game_player_2') : t('game_opp')}</span>
                        {roomData.isSuddenDeath && <span className="ml-2 text-amber-500 sm:text-lg opacity-70 animate-pulse" title={t('rule_sudden_death')}>⚡</span>}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        {!isSpectatorSafe && (
                            <>
                                <div className={`px-2 py-1 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black ${isMyTurnSafe ? 'bg-amber-500 text-white shadow-md' : 'bg-theme-main text-theme-text opacity-70'}`}>
                                    {isMyTurnSafe ? t('game_your_turn') : t('game_wait')} ({turnTimeLeft}с)
                                </div>
                                {!isMyTurnSafe && rawTurnTimeLeft === 0 && roomData.status === 'playing' && (
                                    <div className="bg-red-500 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black shadow-lg animate-pulse">{t('game_time_up')}</div>
                                )}
                            </>
                        )}
                        <button onClick={isSpectatorSafe ? () => router.push('/dashboard') : handleLeaveOrSurrender} className="bg-theme-main px-2 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-sm rounded-xl hover:bg-red-500 hover:text-white text-theme-text font-bold transition-colors shadow-sm">
                            {isSpectatorSafe ? t('btn_leave') : (roomData.status === 'finished' ? t('game_leave') : t('btn_surrender'))}
                        </button>
                    </div>
                </div>

                {/* ВЕРХНИЙ ИГРОК (Оппонент) */}
                <div className="flex-none w-full p-2 sm:p-3 rounded-2xl flex justify-between items-center transition-all duration-300 bg-theme-panel/50">

                    <div className="flex flex-col items-center w-14 sm:w-24 relative shrink-0">
                        {renderPlayerHub(opponent, false, oppIsTurn)}
                    </div>

                    <div className="flex-1 flex flex-col items-center min-w-0">
                        <div className="flex justify-center -space-x-6 sm:-space-x-8 md:-space-x-12 w-full px-4">
                            {opponent.hand.map(card => {
                                return (
                                    <motion.div
                                        key={card.id}
                                        layoutId={`card-${card.id}`}
                                        layout
                                        className={`w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl shadow-md transition-transform ${oppIsTurn ? 'hover:-translate-y-2' : ''}`}
                                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--bg-panel), var(--bg-panel) 10px, var(--bg-main) 10px, var(--bg-main) 20px)' }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {opponent.id === dealerId ? (
                        <div className="flex flex-col items-center gap-1 w-14 sm:w-24 relative shrink-0">
                            {renderDeckArea(game)}
                        </div>
                    ) : (
                        <div className="w-14 sm:w-24 shrink-0"></div>
                    )}
                </div>

                {/* ИГРОВОЙ СТОЛ */}
                {/* 🟢 УБРАН overflow-hidden и overflow-y-auto, чтобы карты летали свободно */}
                <div className="flex-1 w-full rounded-[1.5rem] sm:rounded-[3rem] bg-theme-panel shadow-inner p-3 sm:p-6 relative flex flex-col" id="game-table-container">

                    {/* Текст теперь просто наслаивается абсолютом и не ломает DOM-дерево */}
                    {game.table.length === 0 && animationState.phase === 'idle' && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-40 text-lg sm:text-2xl font-black uppercase tracking-widest text-theme-text text-center pointer-events-none">
                            {t('game_table_empty')}
                        </div>
                    )}

                    {/* Контейнер рендерится ВСЕГДА, поэтому карты больше не пропадают при полете на пустой стол */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-4 justify-center content-center flex-1">
                        {game.table.map(card => {
                            const isTarget = (animationState.phase === 'gathering') &&
                                animationState.action &&
                                (animationState.action.playedCard.id === card.id ||
                                    animationState.action.capturedCards.some((c: Card) => c.id === card.id));

                            return (
                                <PlayingCard
                                    key={card.id}
                                    card={card}
                                    disabled={!isMyTurnSafe || isSpectatorSafe || animationState.phase !== 'idle'}
                                    isSelected={selectedTableCards.includes(card.id)}
                                    isCapturedTarget={isTarget}
                                    onClick={() => toggleTableCardSelection(card.id)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* НИЖНИЙ ИГРОК (Вы) */}
                {!isSpectatorSafe && (
                    <div className="flex-none w-full p-2 sm:p-3 rounded-[1.5rem] flex justify-between items-center transition-all duration-300 bg-theme-panel">

                        <div className="flex flex-col items-center w-14 sm:w-24 relative shrink-0">
                            {renderPlayerHub(me, true, isMyTurnSafe)}
                        </div>

                        <div className="flex-1 flex flex-col items-center min-w-0">
                            <div className="flex justify-center -space-x-2 sm:space-x-2 w-full px-2">
                                {me.hand.map(card => {
                                    return (
                                        <PlayingCard
                                            key={card.id}
                                            card={card}
                                            onClick={handlePlayerMove}
                                            disabled={!isMyTurnSafe || isProcessing.current || game.isRoundOver || animationState.phase !== 'idle'}
                                            isPending={pendingMove?.card.id === card.id}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {me.id === dealerId ? (
                            <div className="flex flex-col items-center gap-1 w-14 sm:w-24 relative shrink-0">
                                {renderDeckArea(game)}
                            </div>
                        ) : (
                            <div className="w-14 sm:w-24 shrink-0"></div>
                        )}
                    </div>
                )}
            </div>

            {/* Модалки и Иконки (оставлены без изменений) */}
            {(game.isRoundOver || game.isMatchOver) && !isSpectatorSafe && animationState.phase === 'idle' && roomData.status !== 'pause_requested' && (
                <Modal>
                    <div className="text-center">
                        {game.isMatchOver ? (
                            <>
                                <h2 className="text-3xl sm:text-4xl font-black mb-2 text-theme-primary tracking-wider">{game.matchWinnerTeamId === me.teamId ? t('game_victory') : t('game_defeat')}</h2>
                                <p className="opacity-70 mb-6 font-bold">{t('game_score')} {game.matchScores[me.teamId]} - {game.matchScores[opponent.teamId]}</p>

                                {meLobbyInfo?.isReady ? (
                                    <div className="w-full mt-4 bg-theme-main border-2 border-theme-border text-theme-text py-4 rounded-xl font-black opacity-70">{t('game_waiting_opponent')}</div>
                                ) : (
                                    <div className="flex flex-col gap-3 mt-4">
                                        <button onClick={() => gameApi.rematch(roomId)} className="w-full bg-theme-primary text-white py-4 rounded-xl font-black shadow-lg">🔄 {t('game_rematch')} ({roomData.betAmount} 💰)</button>
                                        <button onClick={handleLeaveOrSurrender} className="w-full bg-theme-main border-2 border-theme-border text-theme-text py-4 rounded-xl font-black hover:bg-theme-border transition-colors">{t('game_return_lobby')}</button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl sm:text-3xl font-black mb-2 text-theme-text">{t('game_round')} {game.roundNumber} {t('game_completed')}</h2>
                                <p className="text-theme-primary mb-6 font-mono font-black text-2xl">{t('game_score')} {game.matchScores[me.teamId]} - {game.matchScores[opponent.teamId]}</p>
                                <div className="flex flex-col gap-3">
                                    {isPlayer0 ? <button onClick={() => gameApi.nextRound(roomId).catch(e => showAlert(t(e.message)))} className="w-full bg-theme-primary text-white py-3 sm:py-4 rounded-xl font-black shadow-lg">{t('game_deal_cards')}</button> : <div className="opacity-70 font-black py-2 text-theme-text">{t('game_wait_deal')}</div>}

                                    {roomData.status === 'playing' && (
                                        <button onClick={() => gameApi.proposePause(roomId)} className="w-full bg-theme-main border-2 border-theme-border text-theme-text py-3 rounded-xl font-bold hover:bg-theme-border transition-colors mt-2">
                                            {t('game_pause_btn')}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            )}

            {roomData.status === 'pause_requested' && !isSpectatorSafe && (
                <Modal>
                    <div className="text-center">
                        <h2 className="text-2xl font-black mb-4">{t('game_pause_req_title')}</h2>
                        {roomData.pauseProposals?.includes(safeMyId) ? (
                            <p className="opacity-80 mb-4 font-bold">{t('game_pause_wait')} ({turnTimeLeft}с)</p>
                        ) : (
                            <>
                                <p className="opacity-80 mb-6 font-bold">{t('game_pause_ask')} ({turnTimeLeft}с)</p>
                                <div className="flex gap-3">
                                    <button onClick={() => gameApi.answerPauseRequest(roomId, false)} className="flex-1 bg-theme-main border-2 border-theme-border py-3 rounded-xl font-bold hover:bg-theme-border transition-colors">{t('game_continue')}</button>
                                    <button onClick={() => gameApi.answerPauseRequest(roomId, true)} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-amber-600 transition-colors">{t('game_agree')}</button>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            )}

            {otherRooms.length > 0 && (
                <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40 pointer-events-none">
                    {otherRooms.map(room => {
                        const roomSafeMyId = sessionStorage.getItem(`pasur_mask_${room.id}`) || user?.uid;
                        const amIActiveThere = room.gameState ? room.gameState.players[room.gameState.currentTurnIndex]?.id === roomSafeMyId : false;
                        const isRoomPlaying = room.status === 'playing';

                        return (
                            <button
                                key={room.id}
                                onClick={() => router.push(`/game/${room.id}`)}
                                className={`pointer-events-auto relative w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-sm transition-transform hover:scale-110 shadow-lg
                                ${amIActiveThere && isRoomPlaying ? 'bg-amber-500 border-white text-white animate-bounce' : 'bg-theme-panel border-theme-border text-theme-text opacity-70'}`}
                            >
                                {room.betAmount >= 1000 ? '💰' : '🎲'}
                                {amIActiveThere && isRoomPlaying && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </main>
    );
}