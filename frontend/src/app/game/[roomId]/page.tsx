"use client";

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { gameApi } from '@/lib/supabase';
import { Card, GameState } from '@/types';
import { useAlert } from '@/components/providers/AlertProvider';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { CapsuleModal } from '@/components/ui/CapsuleModal';
import { useCountdown } from '@/features/game/hooks/useCountdown';
import { PlayingCard } from '@/features/game/components/PlayingCard';

import { useGameRoom } from '@/features/game/hooks/useGameRoom';
import { useGameAnimations } from '@/features/game/hooks/useGameAnimations';
import { useGameTimeouts } from '@/features/game/hooks/useGameTimeouts';
import { PlayerHub } from '@/features/game/components/PlayerHub';
import { WaitingRoomView } from '@/features/game/components/WaitingRoomView';

export default function GameRoomPage() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const { showAlert, showConfirm } = useAlert();

    const { user, roomData, allActiveRooms, myMask, setMyMask } = useGameRoom(roomId);
    const { visualGame, animationState, pendingMove, setPendingMove } = useGameAnimations(roomData?.gameState);

    const [isJoining, setIsJoining] = useState(false);
    const [selectedTableCards, setSelectedTableCards] = useState<string[]>([]);
    const [avatarModal, setAvatarModal] = useState<'none' | 'me' | 'opponent'>('none');
    const isProcessing = useRef(false);

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

    useGameTimeouts(roomId, roomData, isMyTurnSafe, isSpectatorSafe, rawTurnTimeLeft, readyTimeLeft, isProcessing);

    const handleLeaveOrSurrender = () => {
        showConfirm(t('game_surrender_confirm'), async () => {
            isProcessing.current = true;
            try {
                await gameApi.leaveRoom(roomId, 'surrender');
                sessionStorage.removeItem(`pasur_mask_${roomId}`);
                setMyMask(null);
                router.replace('/dashboard');
            } catch (e: any) { showAlert(t(e.message)); isProcessing.current = false; }
        });
    };

    const handleJoinTable = async () => {
        setIsJoining(true);
        try {
            const mask = await gameApi.joinRoom(roomId);
            if (mask) {
                sessionStorage.setItem(`pasur_mask_${roomId}`, mask);
                setMyMask(mask);
            }
        } catch (e: any) { showAlert(t(e.message)); }
        finally { setIsJoining(false); }
    };

    const handleLeaveTable = () => {
        showConfirm(t('game_leave_table'), async () => {
            setIsJoining(true);
            try {
                await gameApi.leaveRoom(roomId, 'leave');
                sessionStorage.removeItem(`pasur_mask_${roomId}`);
                setMyMask(null);
                router.replace('/dashboard');
            } catch (e: any) { showAlert(t(e.message)); }
            finally { setIsJoining(false); }
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

        const currentSelection = [...selectedTableCards];
        setSelectedTableCards([]);
        setPendingMove({ card, isMe: true });
        isProcessing.current = true;

        try { await gameApi.playCard(roomId, card.id, currentSelection); }
        catch (e: any) {
            showAlert(t(e.message));
            setSelectedTableCards(currentSelection);
            setPendingMove(null);
        } finally { isProcessing.current = false; }
    };

    const toggleTableCardSelection = (cardId: string) => {
        if (!isMyTurnSafe || animationState.phase !== 'idle') return;
        setSelectedTableCards(prev => prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]);
    };

    const handleProposePause = async () => {
        if (isProcessing.current) return;

        isProcessing.current = true;
        try {
            await gameApi.proposePause(roomId);
        } catch (e: any) {
            showAlert(t(e.message));
        } finally {
            isProcessing.current = false;
        }
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

    if (!user || !roomData || !safeMyId) {
        return <div className="h-full flex items-center justify-center font-bold text-theme-text animate-pulse">{t('game_loading')}</div>;
    }

    if (roomData.status === 'waiting' || roomData.status === 'ready_check') {
        return <WaitingRoomView roomData={roomData} safeMyId={safeMyId} isJoining={isJoining} onJoin={handleJoinTable} onLeave={handleLeaveTable} />;
    }

    const game = visualGame;
    if (!game) return <div className="h-full flex items-center justify-center font-bold text-theme-text">{t('game_loading')}</div>;

    const me = game.players.find(p => p.id === safeMyId) || game.players[0];
    const opponent = game.players.find(p => p.teamId !== me.teamId);
    if (!opponent) return null;

    const oppIsTurn = !isMyTurnSafe && roomData.status === 'playing';
    const opponentLobbyInfo = roomData.players.find(p => p.id === opponent.id);
    const meLobbyInfo = roomData.players.find(p => p.id === safeMyId);

    const isAnon = (id: string | null | undefined) => id?.startsWith('anon_');
    const getAvatar = (id: string | null | undefined) => id === safeMyId ? (user.avatarEmoji || '😎') : (isAnon(id) ? '👤' : '😎');

    return (
        <main className="fixed inset-0 w-full h-full flex flex-col bg-theme-main overflow-hidden safe-padding">

            <div className="flex-1 w-full h-full max-w-5xl mx-auto flex flex-col p-2 sm:p-4 gap-2 sm:gap-4 relative">
                {/* Оппонент */}
                <div className="flex-none w-full p-2 sm:p-3 rounded-2xl flex justify-between items-center transition-all duration-300 bg-theme-panel/50 relative z-20 shadow-sm">
                    <div className="flex flex-col items-center w-14 sm:w-24 relative shrink-0">
                        <PlayerHub player={opponent} isTurn={oppIsTurn} hasSurs={game.ruleSet === 'classic' && opponent.surs > 0} turnDurationSec={turnDurationSec} turnTimeLeft={turnTimeLeft} avatarEmoji={getAvatar(opponent.id)} animationState={animationState} onClick={() => setAvatarModal('opponent')} avatarType="opponent" />
                    </div>

                    <div className="flex-1 flex flex-col items-center min-w-0">
                        <div className="flex justify-center -space-x-6 sm:-space-x-8 md:-space-x-12 w-full px-4">
                            {opponent.hand.map(card => (
                                <motion.div
                                    key={card.id}
                                    layoutId={`card-${card.id}`}
                                    layout
                                    className={`w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl shadow-md transition-transform ${oppIsTurn ? 'hover:-translate-y-2' : ''}`}
                                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--bg-panel), var(--bg-panel) 10px, var(--bg-main) 10px, var(--bg-main) 20px)' }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 w-14 sm:w-24 relative shrink-0">
                        {opponent.id === dealerId ? renderDeckArea(game) : null}
                    </div>
                </div>

                {/* Стол */}
                <div className="flex-1 w-full relative flex flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden z-10" id="game-table-container">
                    {game.table.length === 0 && animationState.phase === 'idle' && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-40 text-lg sm:text-2xl font-black uppercase tracking-widest text-theme-text text-center pointer-events-none z-0">
                            {t('game_table_empty')}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 sm:gap-4 justify-center content-center flex-1 py-8 sm:py-12 z-10 relative">
                        {game.table.map(card => {
                            const isTarget = (animationState.phase === 'gathering') && animationState.action && (animationState.action.playedCard?.id === card.id || animationState.action.capturedCards?.some((c: Card) => c.id === card.id));
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

                {/* Игрок */}
                {!isSpectatorSafe && (
                    <div className="flex-none w-full p-2 sm:p-3 rounded-[1.5rem] flex justify-between items-center transition-all duration-300 bg-theme-panel relative z-20 shadow-md">
                        <div className="flex flex-col items-center w-14 sm:w-24 relative shrink-0">
                            <PlayerHub player={me} isTurn={isMyTurnSafe} hasSurs={game.ruleSet === 'classic' && me.surs > 0} turnDurationSec={turnDurationSec} turnTimeLeft={turnTimeLeft} avatarEmoji={getAvatar(me.id)} animationState={animationState} onClick={() => setAvatarModal('me')} avatarType="me" />
                        </div>

                        <div className="flex-1 flex flex-col items-center min-w-0">
                            <div className="flex justify-center -space-x-2 sm:space-x-2 w-full px-2">
                                {me.hand.map(card => (
                                    <PlayingCard
                                        key={card.id}
                                        card={card}
                                        onClick={handlePlayerMove}
                                        disabled={!isMyTurnSafe || isProcessing.current || game.isRoundOver || animationState.phase !== 'idle'}
                                        isPending={pendingMove?.card.id === card.id}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-1 w-14 sm:w-24 relative shrink-0">
                            {me.id === dealerId ? renderDeckArea(game) : null}
                        </div>
                    </div>
                )}
            </div>

            <CapsuleModal
                isOpen={avatarModal !== 'none'}
                onClose={() => setAvatarModal('none')}
                layoutId={`avatar-${avatarModal}`}
                headerLeft={<span className="text-xl font-black text-theme-text">{avatarModal === 'me' ? t('game_table') : t('game_player')}</span>}
            >
                {avatarModal === 'opponent' && (
                    <div className="flex flex-col gap-4 items-center mt-2">
                        <div className="text-6xl drop-shadow-md">{getAvatar(opponent.id)}</div>
                        <div className="text-2xl font-black text-theme-text text-center">
                            {opponentLobbyInfo?.name === '__INCOGNITO__' ? t('unknown_player') : (opponentLobbyInfo?.name || t('unknown_player'))}
                        </div>
                        <div className="w-full flex flex-col gap-2 mt-2">
                            <div className="w-full bg-theme-main rounded-2xl p-4 flex justify-between items-center shadow-sm">
                                <span className="font-bold text-theme-text opacity-70">{t('game_score')}</span>
                                <span className="text-xl font-black text-blue-500">{game.matchScores[opponent.teamId] || 0}</span>
                            </div>
                            <div className="w-full bg-theme-main rounded-2xl p-4 flex justify-between items-center shadow-sm">
                                <span className="font-bold text-theme-text opacity-70">{t('game_captured')}</span>
                                <span className="text-lg font-black text-theme-text">{opponent.captured.length}</span>
                            </div>
                        </div>
                    </div>
                )}

                {avatarModal === 'me' && (
                    <div className="flex flex-col gap-3 mt-2">
                        <div className="w-full bg-theme-main rounded-2xl p-4 flex justify-between items-center shadow-sm">
                            <span className="font-bold text-theme-text opacity-70">{t('game_round')}</span>
                            <span className="text-xl font-black text-theme-text">{game.roundNumber}</span>
                        </div>
                        <div className="w-full bg-theme-main rounded-2xl p-4 flex justify-between items-center shadow-sm">
                            <span className="font-bold text-theme-text opacity-70">{t('game_score')}</span>
                            <div className="flex items-center gap-2 font-black text-xl">
                                <span className="text-theme-primary">{game.matchScores[me.teamId] || 0}</span>
                                <span className="opacity-50 text-theme-text">:</span>
                                <span className="text-blue-500">{game.matchScores[opponent.teamId] || 0}</span>
                            </div>
                        </div>
                        <div className="w-full bg-theme-main rounded-2xl p-4 flex justify-between items-center shadow-sm">
                            <span className="font-bold text-theme-text opacity-70">{t('game_bet')}</span>
                            <span className="text-xl font-black text-amber-500">{roomData.betAmount} 💰</span>
                        </div>
                        {roomData.status === 'playing' && (
                            <button
                                onClick={handleProposePause}
                                disabled={isProcessing.current}
                                className="w-full bg-theme-main border-2 border-theme-border text-theme-text py-3 rounded-xl font-bold hover:bg-theme-border transition-colors mt-2"
                            >
                                {t('game_pause_btn')}
                            </button>
                        )}
                    </div>
                )}
            </CapsuleModal>

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
                                        <button
                                            onClick={() => gameApi.proposePause(roomId).catch(e => showAlert(t(e.message)))}
                                            className="w-full bg-theme-main border-2 border-theme-border text-theme-text py-3 rounded-xl font-bold hover:bg-theme-border transition-colors mt-2"
                                        >
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

            {(roomData.status === 'paused' || roomData.status === 'ready_check_resume') && (
                <Modal>
                    <div className="text-center">
                        <h2 className="text-3xl font-black mb-4 text-theme-primary">{roomData.status === 'paused' ? t('game_paused_banner') : t('game_resuming_banner', 'Возобновляем...')}</h2>
                        {roomData.status === 'ready_check_resume' && <div className="text-6xl font-black mb-6 text-theme-text animate-pulse">{readyTimeLeft}</div>}
                        {!isSpectatorSafe && (
                            <div className="flex flex-col gap-3">
                                <button onClick={() => gameApi.toggleReady(roomId, true).catch(e => showAlert(t(e.message)))} disabled={meLobbyInfo?.isReady} className={`w-full py-4 rounded-xl font-black shadow-lg text-white transition-colors ${meLobbyInfo?.isReady ? 'bg-theme-main text-theme-text opacity-70 cursor-not-allowed border-2 border-theme-border' : 'bg-theme-primary hover:opacity-80'}`}>
                                    {meLobbyInfo?.isReady ? t('game_waiting_opponent') : t('game_resume')}
                                </button>
                                <button onClick={handleLeaveOrSurrender} disabled={isProcessing.current} className="text-red-500 hover:text-red-600 font-bold py-2">{t('btn_surrender')}</button>
                            </div>
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
                                className={`pointer-events-auto relative w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-sm transition-transform hover:scale-110 shadow-lg ${amIActiveThere && isRoomPlaying ? 'bg-amber-500 border-white text-white animate-bounce' : 'bg-theme-panel border-theme-border text-theme-text opacity-70'}`}
                            >
                                {room.betAmount >= 1000 ? '💰' : '🎲'}
                                {amIActiveThere && isRoomPlaying && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </main>
    );
}