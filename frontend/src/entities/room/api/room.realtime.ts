import { supabase } from "@/shared/api";
import { GameRoom } from "../model/room.types";
import { GAME_CONFIG } from "@/shared/config/constants";

const mapRoom = (data: any): GameRoom => ({
    id: data.id,
    name: data.name,
    status: data.status,
    maxPlayers: data.max_players,
    betAmount: data.bet_amount,
    ruleSet: data.rule_set,
    isStrict: data.is_strict ?? true,
    isSuddenDeath: data.is_sudden_death ?? false,
    turnDuration: data.turn_duration || GAME_CONFIG.DEFAULT_TURN_DURATION,
    isPrivate: data.is_private,
    joinCode: data.join_code,
    players: data.players || [],
    gameState: data.game_state,
    turnDeadline: data.turn_deadline,
    readyDeadline: data.ready_deadline,
    pauseProposals: data.pause_proposals || [],
    adminMessage: data.admin_message,
    createdAt: data.created_at
});

export const roomRealtimeApi = {
    subscribeToPublicRooms(callback: (rooms: GameRoom[]) => void) {
        let isSubscribed = true;
        let currentRooms: GameRoom[] = [];

        const fetchRooms = async () => {
            const { data } = await supabase.from('rooms')
                .select('*').eq('status', 'waiting').eq('is_private', false)
                .order('created_at', { ascending: false });
            if (data && isSubscribed) {
                currentRooms = data.map(mapRoom);
                callback([...currentRooms]);
            }
        };

        fetchRooms();

        const channel = supabase.channel(`public_rooms_${Math.random().toString(36).substring(7)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'is_private=eq.false' }, (payload) => {
                if (!isSubscribed) return;

                if (payload.eventType === 'INSERT') {
                    if (payload.new.status === 'waiting') {
                        currentRooms = [mapRoom(payload.new), ...currentRooms];
                    }
                } else if (payload.eventType === 'UPDATE') {
                    if (payload.new.status === 'waiting') {
                        const index = currentRooms.findIndex(r => r.id === payload.new.id);
                        if (index !== -1) currentRooms[index] = mapRoom(payload.new);
                        else currentRooms.unshift(mapRoom(payload.new));
                    } else {
                        currentRooms = currentRooms.filter(r => r.id !== payload.new.id);
                    }
                } else if (payload.eventType === 'DELETE') {
                    currentRooms = currentRooms.filter(r => r.id !== payload.old.id);
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
            const { data } = await supabase.from('rooms').select('*').in('id', roomIds);
            if (data && isSubscribed) {
                currentRooms = data.map(mapRoom);
                callback([...currentRooms]);
            }
        };

        fetchRooms();

        const filterStr = `id=in.(${roomIds.join(',')})`;
        const channel = supabase.channel(`active_rooms_${roomIds.join('_').substring(0, 10)}_${Math.random().toString(36).substring(7)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: filterStr }, (payload) => {
                if (!isSubscribed) return;

                if (payload.eventType === 'UPDATE') {
                    currentRooms = currentRooms.map(r => r.id === payload.new.id ? mapRoom(payload.new) : r);
                } else if (payload.eventType === 'DELETE') {
                    currentRooms = currentRooms.filter(r => r.id !== payload.old.id);
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
