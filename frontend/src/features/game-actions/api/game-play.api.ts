import { callApi } from '@/shared1/api';

export const gamePlayApi = {
    async toggleReady(roomId: string, isReady: boolean): Promise<void> {
        await callApi('secureToggleReady', { roomId, isReady });
    },

    async rematch(roomId: string): Promise<void> {
        await callApi('secureRematch', { roomId });
    },

    async playCard(roomId: string, cardId: string, targetCardIds: string[]): Promise<void> {
        await callApi('securePlayCard', { roomId, cardId, targetCardIds });
    },

    async resolveReadyTimeout(roomId: string): Promise<void> {
        try { await callApi('secureResolveReadyTimeout', { roomId }); } catch (e) { }
    },

    async reportAfk(roomId: string): Promise<void> {
        await callApi('reportAfk', { roomId });
    },

    async sendReaction(roomId: string): Promise<void> {
        await callApi('secureSendReaction', { roomId });
    }
};