import { callApi, supabase } from '@/shared1/api';
import { RoomDTO } from '@/shared1/api/contracts/dto';
import { CreateRoomPayload, SearchRoomsFiltersPayload } from '@/shared1/api/contracts/payloads';

export const roomApi = {
    async createRoom(payload: CreateRoomPayload): Promise<string> {
        const data = await callApi('secureCreateRoom', payload);
        
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(`pasur_mask_${data.roomId}`, data.publicUid);
        }
        return data.roomId;
    },

    async joinRoom(roomId: string, joinCode?: string): Promise<string> {
        const data = await callApi('secureJoinRoom', { roomId, joinCode }); 
        
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(`pasur_mask_${roomId}`, data.publicUid);
        }
        return data.publicUid;
    },

    async findPrivateRoom(code: string): Promise<string | null> {
        const { data } = await supabase
            .from('rooms')
            .select('id')
            .eq('join_code', code.toUpperCase())
            .eq('status', 'waiting')
            .limit(1);
            
        return data && data.length > 0 ? data[0].id : null;
    },

    async searchRooms(filters: SearchRoomsFiltersPayload): Promise<RoomDTO[]> {
        const data = await callApi('secureSearchRooms', filters);
        return data?.rooms || [];
    },

    async getMyMask(roomId: string): Promise<string | null> {
        const data = await callApi('secureGetMyMask', { roomId });
        return data?.mask || null;
    },

    async leaveRoom(roomId: string): Promise<void> {
        await callApi('secureLeaveRoom', { roomId }); 
    }
};