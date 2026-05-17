import { useState, useEffect, useRef } from 'react';
import { GameState, Card } from '@/types';

export function useGameAnimations(gameState: GameState | null | undefined) {
    const [visualGame, setVisualGame] = useState<GameState | null>(null);
    const [pendingMove, setPendingMove] = useState<{ card: Card, isMe: boolean } | null>(null);
    const [animationState, setAnimationState] = useState<{
        phase: 'idle' | 'playing' | 'gathering' | 'flying';
        action: any | null;
    }>({ phase: 'idle', action: null });

    const [actionQueue, setActionQueue] = useState<{ action: any; stateSnapshot: GameState }[]>([]);
    const isProcessingQueueRef = useRef(false);
    const lastProcessedTimestamp = useRef<number>(0);
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

    useEffect(() => {
        return () => timeoutsRef.current.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        if (!gameState) {
            setVisualGame(null);
            setAnimationState({ phase: 'idle', action: null });
            setActionQueue([]);
            isProcessingQueueRef.current = false;
            return;
        }

        const serverGame = gameState;

        if (serverGame.lastAction && serverGame.lastAction.timestamp > lastProcessedTimestamp.current) {
            lastProcessedTimestamp.current = serverGame.lastAction.timestamp;
            setActionQueue(q => [...q, { action: serverGame.lastAction, stateSnapshot: serverGame }]);
        } 
        else if (actionQueue.length === 0 && !isProcessingQueueRef.current) {
            setVisualGame(JSON.parse(JSON.stringify(serverGame)));
        }
    }, [gameState, actionQueue.length]);

    useEffect(() => {
        if (actionQueue.length === 0 || isProcessingQueueRef.current) return;

        isProcessingQueueRef.current = true;
        
        const { action, stateSnapshot } = actionQueue[0];

        if (!action || !action.playedCard) {
            setVisualGame(JSON.parse(JSON.stringify(stateSnapshot)));
            setPendingMove(null);
            setAnimationState({ phase: 'idle', action: null });
            setActionQueue(q => q.slice(1));
            isProcessingQueueRef.current = false;
            return;
        }

        const isCapture = action.capturedCards && action.capturedCards.length > 0;

        const schedule = (cb: () => void, delay: number) => {
            const id = setTimeout(cb, delay);
            timeoutsRef.current.push(id);
        };

        setAnimationState({ phase: 'playing', action });
        setVisualGame(prev => {
            const playState = prev ? JSON.parse(JSON.stringify(prev)) : JSON.parse(JSON.stringify(stateSnapshot));
            
            if (playState.players) {
                playState.players.forEach((p: any) => {
                    if (p.hand) {
                        p.hand = p.hand.filter((c: any) => c.id !== action.playedCard.id);
                    }
                });
            }
            
            if (playState.table) {
                if (!playState.table.some((c: any) => c.id === action.playedCard.id)) {
                    playState.table.push(action.playedCard);
                }
            } else {
                playState.table = [action.playedCard];
            }
            
            return playState;
        });

        schedule(() => {
            if (isCapture) {
                setAnimationState({ phase: 'gathering', action });

                schedule(() => {
                    setAnimationState({ phase: 'flying', action });
                    
                    setVisualGame(prev => {
                        const flyState = prev ? JSON.parse(JSON.stringify(prev)) : JSON.parse(JSON.stringify(stateSnapshot));
                        const capturedIds = new Set([action.playedCard.id, ...action.capturedCards.map((c: any) => c.id)]);
                        
                        if (flyState.table) {
                            flyState.table = flyState.table.filter((c: any) => !capturedIds.has(c.id));
                        }
                        return flyState;
                    });

                    schedule(() => {
                        setVisualGame(JSON.parse(JSON.stringify(stateSnapshot)));
                        setPendingMove(null);
                        setAnimationState({ phase: 'idle', action: null });
                        
                        setActionQueue(q => q.slice(1));
                        isProcessingQueueRef.current = false;
                    }, 600);

                }, 1000);
            } else {
                setVisualGame(JSON.parse(JSON.stringify(stateSnapshot)));
                setPendingMove(null);
                setAnimationState({ phase: 'idle', action: null });
                
                setActionQueue(q => q.slice(1));
                isProcessingQueueRef.current = false;
            }
        }, 500);

    }, [actionQueue]);

    return { visualGame, animationState, pendingMove, setPendingMove };
}