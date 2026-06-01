import { callApi, supabase } from '@/shared/api';
import { UserProfile } from '@/entities/user';
import { RuleSetDTO } from '@/shared/api/contracts/dto';
import { GameRoom } from '../model/room.types';

export const roomApi = {
    async createRoom(creator: UserProfile, name: string, bet: number, ruleSet: RuleSetDTO, isPrivate: boolean, isStrict: boolean, isSuddenDeath: boolean, maxPlayers: number, turnDuration: number): Promise<string> {
        if (creator.balance < bet) throw new Error("ERR_NOT_ENOUGH_MONEY");
        const data = await callApi('secureCreateRoom', {
            name,
            betAmount: bet,
            ruleSet,
            isPrivate,
            isStrict,
            isSuddenDeath,
            requiredPlayers: maxPlayers,
            turnDuration: turnDuration
        });
        if (typeof window !== 'undefined') sessionStorage.setItem(`pasur_mask_${data.roomId}`, data.publicUid);
        return data.roomId;
    },

    async joinRoom(roomId: string, joinCode?: string): Promise<string> {
        const data = await callApi('secureJoinRoom', { roomId, joinCode }); // <-- Добавлен joinCode
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

    async leaveRoom(roomId: string): Promise<void> {
        // <-- Убран фейковый reason, бэкенд решает сам
        await callApi('secureLeaveRoom', { roomId }); 
    }
};