import { useEffect, useCallback, MutableRefObject } from 'react';
import { GameRoom, roomApi } from '@/entities/room';
import { gamePlayApi } from '../api/game-play.api';

export function useGameTimeouts(
    roomId: string,
    roomData: GameRoom | null,
    isMyTurnSafe: boolean,
    isSpectatorSafe: boolean,
    rawTurnTimeLeft: number,
    readyTimeLeft: number,
    isProcessing: MutableRefObject<boolean>
) {
    const claimTimeoutVictory = useCallback(async () => {
        if (isProcessing.current) return;
        isProcessing.current = true;
        try { await roomApi.leaveRoom(roomId, 'timeout'); }
        catch (e: any) { if (!e.message?.includes("ERR_INVALID_MOVE")) console.error(e); }
        finally { setTimeout(() => { isProcessing.current = false; }, 2000); }
    }, [roomId, isProcessing]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let interval: NodeJS.Timeout;

        if (roomData?.status === 'playing' && !isMyTurnSafe && !isSpectatorSafe && rawTurnTimeLeft === 0) {
            const attemptKick = () => { if (!isProcessing.current) claimTimeoutVictory(); };
            timeout = setTimeout(attemptKick, 6000);
            interval = setInterval(attemptKick, 3000);
        }

        if (roomData?.status === 'pause_requested' && rawTurnTimeLeft === 0) {
            gamePlayApi.resolvePauseTimeout(roomId);
        }
        return () => { if (timeout) clearTimeout(timeout); if (interval) clearInterval(interval); };
    }, [roomData?.status, isMyTurnSafe, isSpectatorSafe, rawTurnTimeLeft, claimTimeoutVictory, roomId, isProcessing]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let interval: NodeJS.Timeout;
        if ((roomData?.status === 'ready_check' || roomData?.status === 'ready_check_resume') && readyTimeLeft === 0) {
            const attemptResolve = () => {
                if (!isProcessing.current) {
                    isProcessing.current = true;
                    gamePlayApi.resolveReadyTimeout(roomId).finally(() => { setTimeout(() => { isProcessing.current = false; }, 2000); });
                }
            };
            timeout = setTimeout(attemptResolve, 1500);
            interval = setInterval(attemptResolve, 3000);
        }
        return () => { if (timeout) clearTimeout(timeout); if (interval) clearInterval(interval); };
    }, [roomData?.status, readyTimeLeft, roomId, isProcessing]);
}