"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { gamePlayApi, useGameAnimations, useGameTimeouts } from '@/features/game-actions';
import { WaitingRoomCard, roomApi } from '@/entities/room';
import { useGameRoom } from '../model/useGameRoom';
import { GameCard, PublicGameState } from '@/shared/types/api-contract';
import { PlayingCard, PlayerState } from '@/entities/game';
import { useAlert } from '@/app/providers/AlertProvider';
import { Modal } from '@/shared/ui/overlays/Modal';
import { CapsuleModal } from '@/shared/ui/overlays/CapsuleModal';
import { useCountdown } from '@/shared/lib/hooks/useCountdown';
import { PlayerHub } from '@/entities/user';
import { InfoSection } from '@/shared/ui/lists/InfoSection';
import { RowLabel } from '@/shared/ui/lists/RowLabel';


// ==========================================
// 1. Главный контейнер
// ==========================================

export default function GameScreen() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const { showAlert } = useAlert();

    const { user, roomData, allActiveRooms, myMask, setMyMask } = useGameRoom(roomId);
    const { visualGame, animationState, pendingMove, setPendingMove } = useGameAnimations(roomData?.gameState);

    const [isJoining, setIsJoining] = React.useState(false);
    const isProcessing = React.useRef(false);

    const safeMyId = myMask || user?.uid;
    const rawTurnTimeLeft = useCountdown(roomData?.turnDeadline);
    const readyTimeLeft = useCountdown(roomData?.readyDeadline);

    const isSpectatorSafe = roomData ? !roomData.players.some(p => p.id === safeMyId) : true;
    const isMyTurnSafe = !isSpectatorSafe && roomData?.gameState?.currentTurnIndex === roomData?.gameState?.players.findIndex(p => p.id === safeMyId);

    useGameTimeouts(roomId, roomData, isMyTurnSafe, isSpectatorSafe, rawTurnTimeLeft, readyTimeLeft, isProcessing);

    const handleLobbyAction = async (action: 'join' | 'leave' | 'surrender') => {
        setIsJoining(true);
        try {
            if (action === 'join') {
                const mask = await roomApi.joinRoom(roomId);
                if (mask) {
                    sessionStorage.setItem(`pasur_mask_${roomId}`, mask);
                    setMyMask(mask);
                }
            } else {
                await roomApi.leaveRoom(roomId, action);
                sessionStorage.removeItem(`pasur_mask_${roomId}`);
                setMyMask(null);
                router.replace('/dashboard');
            }
        } catch (e: any) {
            showAlert({ title: t(e.message), buttons: [{ text: t('alert_ok'), style: "cancel" }] });
        } finally {
            setIsJoining(false);
        }
    };

    if (!user || !roomData || !safeMyId) {
        return <div className="h-full flex items-center justify-center font-bold animate-pulse">{t('game_loading')}</div>;
    }

    if (roomData.status === 'waiting' || roomData.status === 'ready_check') {
        return <WaitingRoomCard 
            roomData={roomData} 
            safeMyId={safeMyId} 
            isJoining={isJoining} 
            onJoin={() => handleLobbyAction('join')} 
            onLeave={() => handleLobbyAction('leave')} 
        />;
    }

    if (!visualGame) return null;

    return (
        <GameBoard 
            roomData={roomData}
            visualGame={visualGame}
            animationState={animationState}
            user={user}
            safeMyId={safeMyId}
            isMyTurnSafe={isMyTurnSafe}
            isSpectatorSafe={isSpectatorSafe}
            rawTurnTimeLeft={rawTurnTimeLeft}
            readyTimeLeft={readyTimeLeft}
            pendingMove={pendingMove}
            setPendingMove={setPendingMove}
            isProcessing={isProcessing}
            onSurrender={() => handleLobbyAction('surrender')}
        />
    );
}

// ==========================================
// 2. Игровое поле (GameBoard)
// ==========================================

function GameBoard(props: any) {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    
    const [selectedTableCards, setSelectedTableCards] = React.useState<string[]>([]);
    const [modalState, setModalState] = React.useState<{ type: 'none' | 'player_info' | 'game_info', player?: PlayerState | null }>({ type: 'none' });

    const turnDurationSec = Math.floor((props.roomData?.turnDuration || 60000) / 1000);
    const turnTimeLeft = Math.min(props.rawTurnTimeLeft, turnDurationSec);

    const meIndex = props.visualGame.players.findIndex((p: any) => p.id === props.safeMyId);
    const me = meIndex !== -1 ? props.visualGame.players[meIndex] : props.visualGame.players[0];
    
    const topPlayers = React.useMemo(() => {
        if (props.visualGame.players.length === 4 && meIndex !== -1) {
            return [
                props.visualGame.players[(meIndex + 1) % 4],
                props.visualGame.players[(meIndex + 2) % 4],
                props.visualGame.players[(meIndex + 3) % 4],
            ];
        }
        const opponent = props.visualGame.players.find((p: any) => p.teamId !== me.teamId);
        return opponent ? [opponent] : [];
    }, [props.visualGame.players, meIndex, me.teamId]);

    const handlePlayerMove = async (card: GameCard) => {
        if (!props.roomData || props.isProcessing.current || props.animationState.phase !== 'idle') return;

        const currentSelection = [...selectedTableCards];
        setSelectedTableCards([]);
        props.setPendingMove({ card, isMe: true });
        props.isProcessing.current = true;

        try {
            await gamePlayApi.playCard(props.roomData.id, card.id, currentSelection);
        } catch (e: any) {
            showAlert({ title: t(e.message), buttons: [{ text: t('alert_ok'), style: "cancel" }] });
            setSelectedTableCards(currentSelection);
            props.setPendingMove(null);
        } finally {
            props.isProcessing.current = false;
        }
    };

    const getAvatar = React.useCallback((id: string | null | undefined) => {
        return id === props.safeMyId ? (props.user.avatarEmoji || '😎') : (id?.startsWith('anon_') ? '👤' : '😎');
    }, [props.safeMyId, props.user.avatarEmoji]);

    return (
        <main className="fixed inset-0 w-full h-full flex flex-col bg-theme-main overflow-hidden safe-padding">
            
            {/* Оппоненты */}
            <div className="flex-none w-full p-2 pt-4 sm:pt-6 flex justify-around items-start relative z-20">
                {topPlayers.map((player: any) => (
                    <OpponentWidget 
                        key={player.id}
                        player={player}
                        isTurn={!props.isMyTurnSafe && props.visualGame.players[props.visualGame.currentTurnIndex]?.id === player.id}
                        hasSurs={props.visualGame.ruleSet === 'classic' && player.surs > 0}
                        turnDurationSec={turnDurationSec}
                        turnTimeLeft={turnTimeLeft}
                        getAvatar={getAvatar}
                        animationState={props.animationState}
                        safeMyId={props.safeMyId}
                        onClick={() => setModalState({ type: 'player_info', player })}
                    />
                ))}
            </div>

            {/* Стол */}
            <div className="flex-1 w-full relative flex flex-col overflow-y-auto p-4 z-10">
                <div className="flex flex-wrap gap-2 sm:gap-4 justify-center content-center flex-1 z-10 relative">
                    {props.visualGame.table.map((card: GameCard) => (
                        <PlayingCard
                            key={card.id}
                            card={card}
                            disabled={!props.isMyTurnSafe || props.isSpectatorSafe || props.animationState.phase !== 'idle'}
                            isSelected={selectedTableCards.includes(card.id)}
                            onClick={() => {
                                if (props.isMyTurnSafe && props.animationState.phase === 'idle') {
                                    setSelectedTableCards(p => p.includes(card.id) ? p.filter(id => id !== card.id) : [...p, card.id]);
                                }
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Мой игрок */}
            {!props.isSpectatorSafe && (
                <div className="flex-none w-full p-2 sm:p-4 rounded-t-[1.5rem] flex justify-between items-center bg-theme-panel relative z-20 shadow-md">
                    <div className="flex flex-col items-center w-14 sm:w-20 shrink-0 gap-1">
                        <PlayerHub 
                            player={me} 
                            isTurn={props.isMyTurnSafe}
                            hasSurs={props.visualGame.ruleSet === 'classic' && me.surs > 0}
                            turnDurationSec={turnDurationSec} 
                            turnTimeLeft={turnTimeLeft} 
                            avatarEmoji={getAvatar(me.id)} 
                            animationState={props.animationState} 
                            onClick={() => setModalState({ type: 'player_info', player: me })} 
                            avatarType="me"
                        />
                    </div>

                    <div className="flex-1 flex justify-center w-full mt-2 sm:mt-4">
                        <div className="flex justify-center -space-x-2 sm:-space-x-1 md:space-x-2 w-full">
                            {me.hand.map((card: GameCard) => (
                                <PlayingCard
                                    key={card.id}
                                    card={card}
                                    onClick={handlePlayerMove}
                                    disabled={!props.isMyTurnSafe || props.isProcessing.current || props.animationState.phase !== 'idle'}
                                    isPending={props.pendingMove?.card.id === card.id}
                                />
                            ))}
                        </div>
                    </div>

                    <motion.div 
                        layoutId="deck-area"
                        className="flex flex-col items-center w-14 sm:w-20 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setModalState({ type: 'game_info' })}
                    >
                        <DeckArea game={props.visualGame} />
                    </motion.div>
                </div>
            )}

            {/* Информационные окна */}
            <InfoModals 
                state={modalState} 
                onClose={() => setModalState({ type: 'none' })} 
                game={props.visualGame}
                room={props.roomData}
                safeMyId={props.safeMyId}
                turnTimeLeft={turnTimeLeft}
                getAvatar={getAvatar}
                onSurrender={props.onSurrender}
            />

            {/* Игровые модалки (Конец раунда, пауза, готовность) */}
            <GameStatusModals 
                game={props.visualGame}
                roomData={props.roomData}
                safeMyId={props.safeMyId}
                isSpectatorSafe={props.isSpectatorSafe}
                turnTimeLeft={turnTimeLeft}
                readyTimeLeft={props.readyTimeLeft}
                isProcessing={props.isProcessing}
                handleLeaveOrSurrender={props.onSurrender}
            />
        </main>
    );
}

// ==========================================
// 3. Единый виджет Оппонента с правильной математикой
// ==========================================

function OpponentWidget({ player, isTurn, hasSurs, turnDurationSec, turnTimeLeft, getAvatar, animationState, safeMyId, onClick }: any) {
    return (
        <div className="flex flex-col items-center">
            {/* Аватарка (поверх карт) */}
            <div className="relative z-10">
                <PlayerHub
                    player={player}
                    isTurn={isTurn}
                    hasSurs={hasSurs}
                    turnDurationSec={turnDurationSec}
                    turnTimeLeft={turnTimeLeft}
                    avatarEmoji={getAvatar(player.id)}
                    animationState={animationState}
                    onClick={onClick}
                    avatarType={player.id === safeMyId ? "me" : `opp-${player.id}`}
                />
            </div>
            
            {/* Веер карт (подныривает под аватарку) */}
            <div className="flex justify-center -space-x-4 sm:-space-x-5 relative z-0 -mt-3 sm:-mt-5">
                {player.hand.map((card: GameCard, i: number) => {
                    const offset = i - (player.hand.length - 1) / 2;
                    
                    // Идеальная физика веера оппонента (свисает вниз)
                    // Отрицательный rotate + origin-top заставляет низ карт раскрываться веером наружу.
                    // Отрицательный Y тянет крайние карты ВВЕРХ, создавая правильную параболу (без "ушек").
                    const rotate = offset * -12;
                    const y = Math.pow(offset, 2) * -3;

                    return (
                        <motion.div
                            key={card.id}
                            layoutId={`card-${card.id}`}
                            layout
                            className="w-7 h-10 sm:w-9 sm:h-12 md:w-10 md:h-14 rounded-md shadow-sm border border-white/10 origin-top"
                            style={{ 
                                backgroundImage: 'repeating-linear-gradient(45deg, var(--bg-panel), var(--bg-panel) 4px, var(--bg-main) 4px, var(--bg-main) 8px)',
                                rotate,
                                y,
                                zIndex: i
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================
// 4. Компоненты интерфейса
// ==========================================

function DeckArea({ game }: { game: PublicGameState }) {
    const { t } = useTranslation();
    const deckCount = game.deckCount ?? game.deck?.length ?? 0;
    const hasCards = deckCount > 0;

    return (
        <div className="relative flex-shrink-0 w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28">
            <div className={`absolute inset-0 rounded-xl border-4 flex flex-col overflow-hidden shadow-md ${hasCards ? 'border-theme-border bg-theme-main' : 'border-dashed border-theme-border opacity-40 bg-theme-panel/50'}`}>
                <div className="flex-1 flex items-center justify-center">
                    {!hasCards && <span className="text-[10px] sm:text-xs font-bold text-theme-text opacity-50 px-1 text-center">{t('game_empty')}</span>}
                    {hasCards && <span className="text-xl">ℹ️</span>}
                </div>
                {hasCards && (
                    <div className="w-full bg-theme-panel border-t-2 border-theme-border text-theme-text text-[10px] sm:text-xs md:text-sm font-black py-0.5 sm:py-1 flex items-center justify-center shadow-inner shrink-0">
                        {deckCount}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 5. Информационные Модалки
// ==========================================

function InfoModals({ state, onClose, game, room, safeMyId, turnTimeLeft, getAvatar, onSurrender }: any) {
    const { t } = useTranslation();

    const isPlayerTurn = state.player ? game.players[game.currentTurnIndex]?.id === state.player.id : false;
    const meIndex = game.players.findIndex((p: any) => p.id === safeMyId);
    const meTeam = meIndex !== -1 ? game.players[meIndex].teamId : 0;
    const oppTeam = meTeam === 0 ? 1 : 0;

    const modalLayoutId = state.type === 'game_info' 
        ? 'deck-area' 
        : (state.player ? `avatar-${state.player.id === safeMyId ? 'me' : `opp-${state.player.id}`}` : 'none');

    return (
        <CapsuleModal
            isOpen={state.type !== 'none'}
            onClose={onClose}
            layoutId={modalLayoutId}
            headerLeft={<span className="text-xl font-black text-theme-text">{state.type === 'game_info' ? t('game_info_title', 'Детали игры') : t('player_info_title', 'Игрок')}</span>}
        >
            {state.type === 'player_info' && state.player && (
                <div className="w-full">
                    <div className="flex flex-col gap-2 items-center mb-6">
                        <div className="text-6xl drop-shadow-md">{getAvatar(state.player.id)}</div>
                        <div className="text-2xl font-black text-theme-text text-center">
                            {state.player.name || t('unknown_player')}
                        </div>
                    </div>

                    <InfoSection
                        title={t('game_stats', 'Статистика')}
                        items={[
                            {
                                id: 'timer',
                                interactive: false,
                                variant: 'none',
                                content: (
                                    <div className="flex justify-between items-center w-full px-4 py-2">
                                        <RowLabel icon="⏱" iconBg="bg-blue-500" title={t('time_left', 'Остаток хода')} />
                                        <span className="text-3xl font-black text-blue-500">
                                            {isPlayerTurn ? <span className="animate-pulse">{turnTimeLeft} с</span> : "⏳"}
                                        </span>
                                    </div>
                                )
                            },
                            {
                                id: 'captured',
                                interactive: false,
                                variant: 'none',
                                content: (
                                    <div className="flex justify-between items-center w-full px-4 py-2">
                                        <RowLabel icon="🃏" iconBg="bg-green-500" title={t('game_captured', 'Захвачено карт')} />
                                        <span className="text-xl font-black text-theme-text">{state.player.captured.length}</span>
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            )}

            {state.type === 'game_info' && (
                <div className="w-full flex flex-col gap-4">
                    <InfoSection
                        title={t('game_details', 'Текущая партия')}
                        items={[
                            {
                                id: 'round',
                                interactive: false,
                                variant: 'none',
                                content: (
                                    <div className="flex justify-between items-center w-full px-4 py-2">
                                        <RowLabel icon="🔄" iconBg="bg-purple-500" title={t('game_round', 'Раунд')} />
                                        <span className="text-xl font-black text-theme-text">{game.roundNumber}</span>
                                    </div>
                                )
                            },
                            {
                                id: 'score',
                                interactive: false,
                                variant: 'none',
                                content: (
                                    <div className="flex justify-between items-center w-full px-4 py-2">
                                        <RowLabel icon="🏆" iconBg="bg-blue-500" title={t('game_score', 'Счет')} />
                                        <div className="flex items-center gap-2 font-black text-xl">
                                            <span className="text-theme-primary">{game.matchScores[meTeam] || 0}</span>
                                            <span className="opacity-50 text-theme-text">:</span>
                                            <span className="text-blue-500">{game.matchScores[oppTeam] || 0}</span>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                id: 'bet',
                                interactive: false,
                                variant: 'none',
                                content: (
                                    <div className="flex justify-between items-center w-full px-4 py-2">
                                        <RowLabel icon="💰" iconBg="bg-amber-500" title={t('game_bet', 'Ставка')} />
                                        <span className="text-xl font-black text-amber-500">{room.betAmount}</span>
                                    </div>
                                )
                            }
                        ]}
                    />

                    {room.status === 'playing' && (
                        <button 
                            onClick={() => { onClose(); onSurrender(); }} 
                            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg transition-colors mt-2"
                        >
                            {t('btn_surrender', 'Сдаться')}
                        </button>
                    )}
                </div>
            )}
        </CapsuleModal>
    );
}

// ==========================================
// 6. Игровые Модалки (Статус, Конец раунда)
// ==========================================

function GameStatusModals({ game, roomData, safeMyId, isSpectatorSafe, turnTimeLeft, readyTimeLeft, isProcessing, handleLeaveOrSurrender }: any) {
    const { t } = useTranslation();
    const { showAlert } = useAlert();

    const meLobbyInfo = roomData.players.find((p: any) => p.id === safeMyId);
    const isPlayer0 = roomData.players[0]?.id === safeMyId;
    
    const meIndex = game.players.findIndex((p: any) => p.id === safeMyId);
    const meTeamId = meIndex !== -1 ? game.players[meIndex].teamId : 0;
    const oppTeamId = meTeamId === 0 ? 1 : 0;

    // 1. Модалка конца раунда / матча
    if ((game.isRoundOver || game.isMatchOver) && !isSpectatorSafe && roomData.status !== 'pause_requested') {
        return (
            <Modal>
                <div className="text-center">
                    {game.isMatchOver ? (
                        <>
                            <h2 className="text-3xl sm:text-4xl font-black mb-2 text-theme-primary tracking-wider">{game.matchWinnerTeamId === meTeamId ? t('game_victory') : t('game_defeat')}</h2>
                            <p className="opacity-70 mb-6 font-bold">{t('game_score')} {game.matchScores[meTeamId]} - {game.matchScores[oppTeamId]}</p>
                            {meLobbyInfo?.isReady ? (
                                <div className="w-full mt-4 bg-theme-main border-2 border-theme-border text-theme-text py-4 rounded-xl font-black opacity-70">{t('game_waiting_opponent')}</div>
                            ) : (
                                <div className="flex flex-col gap-3 mt-4">
                                    <button onClick={() => gamePlayApi.rematch(roomData.id)} className="w-full bg-theme-primary text-white py-4 rounded-xl font-black shadow-lg">🔄 {t('game_rematch')} ({roomData.betAmount} 💰)</button>
                                    <button onClick={handleLeaveOrSurrender} className="w-full bg-theme-main border-2 border-theme-border text-theme-text py-4 rounded-xl font-black hover:bg-theme-border transition-colors">{t('game_return_lobby')}</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-theme-text">{t('game_round')} {game.roundNumber} {t('game_completed')}</h2>
                            <p className="text-theme-primary mb-6 font-mono font-black text-2xl">{t('game_score')} {game.matchScores[meTeamId]} - {game.matchScores[oppTeamId]}</p>
                            <div className="flex flex-col gap-3">
                                {isPlayer0 ? (
                                    <button onClick={() => gamePlayApi.nextRound(roomData.id).catch(e => showAlert({ title: t(e.message), buttons: [{ text: t('alert_ok'), style: "cancel" }] }))} className="w-full bg-theme-primary text-white py-3 sm:py-4 rounded-xl font-black shadow-lg">{t('game_deal_cards')}</button>
                                ) : (
                                    <div className="opacity-70 font-black py-2 text-theme-text">{t('game_wait_deal')}</div>
                                )}
                                {roomData.status === 'playing' && (
                                    <button onClick={() => gamePlayApi.proposePause(roomData.id).catch(e => showAlert({ title: t(e.message), buttons: [{ text: t('alert_ok'), style: "cancel" }] }))} className="w-full bg-theme-main border-2 border-theme-border text-theme-text py-3 rounded-xl font-bold hover:bg-theme-border transition-colors mt-2">{t('game_pause_btn')}</button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        );
    }

    // 2. Модалка запроса на паузу
    if (roomData.status === 'pause_requested' && !isSpectatorSafe) {
        return (
            <Modal>
                <div className="text-center">
                    <h2 className="text-2xl font-black mb-4">{t('game_pause_req_title')}</h2>
                    {roomData.pauseProposals?.includes(safeMyId) ? (
                        <p className="opacity-80 mb-4 font-bold">{t('game_pause_wait')} ({turnTimeLeft}с)</p>
                    ) : (
                        <>
                            <p className="opacity-80 mb-6 font-bold">{t('game_pause_ask')} ({turnTimeLeft}с)</p>
                            <div className="flex gap-3">
                                <button onClick={() => gamePlayApi.answerPauseRequest(roomData.id, false)} className="flex-1 bg-theme-main border-2 border-theme-border py-3 rounded-xl font-bold hover:bg-theme-border transition-colors">{t('game_continue')}</button>
                                <button onClick={() => gamePlayApi.answerPauseRequest(roomData.id, true)} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-amber-600 transition-colors">{t('game_agree')}</button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        );
    }

    // 3. Модалка состояния "Пауза" или "Готовность"
    if ((roomData.status === 'paused' || roomData.status === 'ready_check_resume')) {
        return (
            <Modal>
                <div className="text-center">
                    <h2 className="text-3xl font-black mb-4 text-theme-primary">{roomData.status === 'paused' ? t('game_paused_banner') : t('game_resuming_banner', 'Возобновляем...')}</h2>
                    {roomData.status === 'ready_check_resume' && <div className="text-6xl font-black mb-6 text-theme-text animate-pulse">{readyTimeLeft}</div>}
                    {!isSpectatorSafe && (
                        <div className="flex flex-col gap-3">
                            <button onClick={() => gamePlayApi.toggleReady(roomData.id, true).catch(e => showAlert({ title: t(e.message), buttons: [{ text: t('alert_ok'), style: "cancel" }] }))} disabled={meLobbyInfo?.isReady} className={`w-full py-4 rounded-xl font-black shadow-lg text-white transition-colors ${meLobbyInfo?.isReady ? 'bg-theme-main text-theme-text opacity-70 cursor-not-allowed border-2 border-theme-border' : 'bg-theme-primary hover:opacity-80'}`}>
                                {meLobbyInfo?.isReady ? t('game_waiting_opponent') : t('game_resume')}
                            </button>
                            <button onClick={handleLeaveOrSurrender} disabled={isProcessing.current} className="text-red-500 hover:text-red-600 font-bold py-2">{t('btn_surrender')}</button>
                        </div>
                    )}
                </div>
            </Modal>
        );
    }

    return null;
}