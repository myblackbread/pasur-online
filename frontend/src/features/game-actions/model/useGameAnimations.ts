import { useState, useEffect } from 'react';
import { PublicGameStateDTO, GameCardDTO } from '@/shared1/api/contracts/dto';

export type PendingMove = {
    card: GameCardDTO;
    isMe: boolean;
} | null;

export function useGameAnimations(gameState: PublicGameStateDTO | null | undefined) {
    // Пока без очередей анимации — просто копируем серверный стейт
    const [visualGame, setVisualGame] = useState<PublicGameStateDTO | null>(gameState || null);
    
    // Стейт для локального предикта (блокирует карту, пока ждем ответ сети)
    const [pendingMove, setPendingMove] = useState<PendingMove>(null);

    useEffect(() => {
        if (gameState) {
            setVisualGame(gameState);
            // Если пришел новый стейт от сервера, значит наш ход (или чужой) принят.
            // Сбрасываем pendingMove, чтобы разблокировать интерфейс.
            setPendingMove(null); 
        } else {
            setVisualGame(null);
        }
    }, [gameState]);

    return { 
        visualGame, 
        // Жесткая заглушка, чтобы GameScreen думал, что анимаций сейчас нет (phase: 'idle')
        animationState: { phase: 'idle', action: null }, 
        pendingMove, 
        setPendingMove 
    };
}