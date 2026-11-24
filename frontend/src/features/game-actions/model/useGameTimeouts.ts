import { useEffect, MutableRefObject } from 'react';
import { RoomStatusDTO } from '@/shared1/api/contracts/dto';
import { gamePlayApi } from '../api/game-play.api';

export function useGameTimeouts(
    roomId: string,
    status: RoomStatusDTO | undefined,
    activeDeadline: number | null | undefined,
    isProcessing: MutableRefObject<boolean>
) {
    useEffect(() => {
        let interval: NodeJS.Timeout;

        // Если мы в лобби или на паузе, и время вышло — можем дернуть сервер, чтобы он разрешил ситуацию
        if ((status === 'waiting' || status === 'paused') && activeDeadline) {
            interval = setInterval(() => {
                if (Date.now() >= activeDeadline && !isProcessing.current) {
                    isProcessing.current = true;
                    gamePlayApi.resolveReadyTimeout(roomId).finally(() => { 
                        setTimeout(() => { isProcessing.current = false; }, 2000); 
                    });
                }
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [status, activeDeadline, roomId, isProcessing]);
}