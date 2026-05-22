import { callApi, supabase } from '@/shared/api';
import { UserProfile } from '@/entities/user';
import { RuleSet } from '@/entities/game';
import { GameRoom } from '../model/room.types';

export const roomApi = {
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

    async searchRooms(filters: any): Promise<GameRoom[]> {
        const data = await callApi('secureSearchRooms', filters);
        return data?.rooms || [];
    },

    async getMyMask(roomId: string): Promise<string | null> {
        const data = await callApi('secureGetMyMask', { roomId });
        return data?.mask || null;
    },

    async leaveRoom(roomId: string, reason: 'leave' | 'surrender' | 'timeout'): Promise<void> {
        await callApi('secureLeaveRoom', { roomId, reason });
    }
};