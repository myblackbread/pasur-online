import { useState, useEffect, useRef } from 'react';
import { PublicGameStateDTO, AnimationCommandDTO } from '@/shared/api/contracts/dto';

export function useGameAnimations(gameState: PublicGameStateDTO | null | undefined) {
    const [visualGame, setVisualGame] = useState<PublicGameStateDTO | null>(null);
    const [activeCommands, setActiveCommands] = useState<AnimationCommandDTO[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    
    const lastTrackId = useRef<string | null>(null);
    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

    useEffect(() => {
        return () => timeoutsRef.current.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        if (!gameState) {
            setVisualGame(null);
            setActiveCommands([]);
            setIsAnimating(false);
            lastTrackId.current = null;
            return;
        }

        const track = gameState.animationTrack;
        
        // Если прилетел новый трек анимации
        if (track && track.id !== lastTrackId.current) {
            lastTrackId.current = track.id;
            setIsAnimating(true);
            
            // Очищаем старые таймеры, если вдруг что-то прервалось
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current = [];

            let maxEndTime = 0;

            track.commands.forEach((cmd) => {
                const endTime = cmd.delay + cmd.duration;
                if (endTime > maxEndTime) maxEndTime = endTime;

                // Запускаем команду (карта начинает полет)
                const startId = setTimeout(() => {
                    setActiveCommands(prev => [...prev, cmd]);
                }, cmd.delay);
                timeoutsRef.current.push(startId);
                
                // Убираем команду после завершения полета
                const endId = setTimeout(() => {
                    setActiveCommands(prev => prev.filter(c => c !== cmd));
                }, endTime);
                timeoutsRef.current.push(endId);
            });

            // Когда все анимации закончились — жестко синхронизируем визуальное состояние с сервером
            const syncId = setTimeout(() => {
                setVisualGame(gameState);
                setIsAnimating(false);
                setActiveCommands([]);
            }, maxEndTime + 100); // 100ms буфер
            timeoutsRef.current.push(syncId);

        } else if (!isAnimating) {
            // Если анимаций нет (или они закончились) — просто показываем стейт как есть
            setVisualGame(gameState);
        }
    }, [gameState]);

    return { visualGame, activeCommands, isAnimating };
}