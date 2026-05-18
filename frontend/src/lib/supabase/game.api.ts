import { callApi, supabase } from './client';
import { UserProfile, RuleSet, GameRoom } from '@/types';

export const gameApi = {
    async createRoom(creator: UserProfile, name: string, bet: number, ruleSet: RuleSet, isPrivate: boolean, isStrict: boolean, isSuddenDeath: boolean, maxPlayers: number, turnDuration: number): Promise<string> {
        if (creator.balance < bet) throw new Error("ERR_NOT_ENOUGH_MONEY");
        const data = await callApi('secureCreateRoom', { name, betAmount: bet, ruleSet, isPrivate, isStrict, isSuddenDeath, maxPlayers, turnDuration });
        if (typeof window !== 'undefined') sessionStorage.setItem(`pasur_mask_${data.roomId}`, data.publicUid);
        return data.roomId;
    },

    async joinRoom(roomId: string): Promise<string> {
        const data = await callApi('secureJoinRoom', { roomId });
        if (typeof window !== 'undefined') sessionStorage.setItem(`pasur_mask_${roomId}`, data.publicUid);
        return data.publicUid;
    },

    async findPrivateRoom(code: string): Promise<string | null> {
        const { data } = await supabase.from('rooms').select('id').eq('join_code', code.toUpperCase()).eq('status', 'waiting').limit(1);
        return data && data.length > 0 ? data[0].id : null;
    },

    async updateUserEmoji(uid: string, emoji: string) {
        const { data } = await supabase.from('users').select('settings').eq('id', uid).single();
        if (data) {
            const newSettings = { ...data.settings, avatarEmoji: emoji };
            await supabase.from('users').update({ settings: newSettings }).eq('id', uid);
        }
    },

    async addMoney(uid: string, amount: number): Promise<void> { await callApi('devAddMoney'); },
    async toggleReady(roomId: string, isReady: boolean): Promise<void> { await callApi('secureToggleReady', { roomId, isReady }); },
    async proposePause(roomId: string): Promise<void> { await callApi('secureProposePause', { roomId }); },
    async answerPauseRequest(roomId: string, accept: boolean): Promise<void> { await callApi('secureAnswerPauseRequest', { roomId, accept }); },
    async resolvePauseTimeout(roomId: string): Promise<void> { try { await callApi('secureResolvePauseTimeout', { roomId }); } catch (e) {} },
    async resolveReadyTimeout(roomId: string): Promise<void> { try { await callApi('secureResolveReadyTimeout', { roomId }); } catch (e) {} },
    async rematch(roomId: string): Promise<void> { await callApi('secureRematch', { roomId }); },
    async leaveRoom(roomId: string, reason: 'leave' | 'surrender' | 'timeout'): Promise<void> { await callApi('secureLeaveRoom', { roomId, reason }); },
    async nextRound(roomId: string): Promise<void> { await callApi('secureNextRound', { roomId }); },
    async adminDeleteUser(uidToKill: string): Promise<void> { await callApi('adminDeleteUser', { uidToKill }); },
    
    async getMyMask(roomId: string): Promise<string | null> {
        const data = await callApi('secureGetMyMask', { roomId });
        return data?.mask || null;
    },

    async playCard(roomId: string, cardId: string, targetCardIds: string[]): Promise<void> {
        await callApi('securePlayCard', { roomId, cardId, targetCardIds });
    },

    async searchRooms(filters: any): Promise<GameRoom[]> {
        const data = await callApi('secureSearchRooms', filters);
        return data?.rooms || [];
    }
};