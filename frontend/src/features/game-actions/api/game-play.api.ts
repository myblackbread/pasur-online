import { callApi } from '@/shared/api';

export const gamePlayApi = {
    async toggleReady(roomId: string, isReady: boolean): Promise<void> {
        await callApi('secureToggleReady', { roomId, isReady });
    },

    async proposePause(roomId: string): Promise<void> {
        await callApi('secureProposePause', { roomId });
    },

    async rematch(roomId: string): Promise<void> {
        await callApi('secureRematch', { roomId });
    },

    async nextRound(roomId: string): Promise<void> {
        await callApi('secureNextRound', { roomId });
    },

    async playCard(roomId: string, cardId: string, targetCardIds: string[]): Promise<void> {
        await callApi('securePlayCard', { roomId, cardId, targetCardIds });
    },

    async answerPauseRequest(roomId: string, accept: boolean): Promise<void> {
        await callApi('secureAnswerPauseRequest', { roomId, accept });
    },

    async resolvePauseTimeout(roomId: string): Promise<void> {
        try { await callApi('secureResolvePauseTimeout', { roomId }); } catch (e) { }
    },

    async resolveReadyTimeout(roomId: string): Promise<void> {
        try { await callApi('secureResolveReadyTimeout', { roomId }); } catch (e) { }
    },
};