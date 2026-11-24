import { supabase, mapRoomFromDB } from "@/shared1/api";
import { GameRoom } from "../model/room.types";
import { v4 as uuidv4 } from 'uuid';

export const roomRealtimeApi = {
    subscribeToPublicRooms(callback: (rooms: GameRoom[]) => void) {
        let isSubscribed = true;
        let currentRooms: GameRoom[] = [];

        const fetchRooms = async () => {
            const { data } = await supabase
                .from('rooms')
                .select('*')
                .eq('status', 'waiting')
                .is('join_code', null)
                .order('created_at', { ascending: false });

            if (data && isSubscribed) {
                currentRooms = data.map(mapRoomFromDB);
                callback([...currentRooms]);
            }
        };

        fetchRooms();

        const channel = supabase
            .channel(`public_rooms_${uuidv4()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'join_code=is.null' }, (payload) => {
                if (!isSubscribed) return;

                switch (payload.eventType) {
                    case 'INSERT':
                        if (payload.new.status === 'waiting') {
                            currentRooms = [mapRoomFromDB(payload.new), ...currentRooms];
                        }
                        break;
                    case 'UPDATE':
                        if (payload.new.status === 'waiting') {
                            const index = currentRooms.findIndex(r => r.id === payload.new.id);
                            if (index !== -1) currentRooms[index] = mapRoomFromDB(payload.new);
                            else currentRooms.unshift(mapRoomFromDB(payload.new));
                        } else {
                            currentRooms = currentRooms.filter(r => r.id !== payload.new.id);
                        }
                        break;
                    case 'DELETE':
                        currentRooms = currentRooms.filter(r => r.id !== payload.old.id);
                        break;
                }
                callback([...currentRooms]);
            })
            .subscribe();

        return () => {
            isSubscribed = false;
            supabase.removeChannel(channel);
        };
    },

    subscribeToRoomsByIds(roomIds: string[], callback: (rooms: GameRoom[]) => void) {
        let isSubscribed = true;
        if (!roomIds.length) {
            callback([]);
            return () => { isSubscribed = false; };
        }

        let currentRooms: GameRoom[] = [];

        const fetchRooms = async () => {
            const { data } = await supabase
                .from('rooms')
                .select('*')
                .in('id', roomIds);
            if (data && isSubscribed) {
                currentRooms = data.map(mapRoomFromDB);
                callback([...currentRooms]);
            }
        };

        fetchRooms();

        const channel = supabase
            .channel(`public_rooms_${uuidv4()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=in.(${roomIds.join(',')})` }, (payload) => {
                if (!isSubscribed) return;

                switch (payload.eventType) {
                    case 'UPDATE':
                        currentRooms = currentRooms.map(r => r.id === payload.new.id ? mapRoomFromDB(payload.new) : r);
                        break;
                    case 'DELETE':
                        currentRooms = currentRooms.filter(r => r.id !== payload.old.id);
                        break;
                }
                callback([...currentRooms]);
            })
            .subscribe();

        return () => {
            isSubscribed = false;
            supabase.removeChannel(channel);
        };
    }
}