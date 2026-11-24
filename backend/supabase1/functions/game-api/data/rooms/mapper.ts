import { Database } from "@/core/database/database.types.ts";
import { Room, RoomPlayer } from "@/shared/index.ts";
import { FullGameState, RoomSecrets } from "@/core/engine/models.ts";

type DbRoomRow = Database['public']['Tables']['rooms']['Row'];
type DbRoomInsert = Database['public']['Tables']['rooms']['Insert'];
type DbRoomUpdate = Database['public']['Tables']['rooms']['Update'];

export const RoomMapper = {
    toDomain(dbRoom: DbRoomRow): Room {
        return {
            id: dbRoom.id,
            name: dbRoom.name,
            betAmount: dbRoom.bet_amount,
            ruleSet: dbRoom.rule_set,
            isStrict: dbRoom.is_strict,
            isSuddenDeath: dbRoom.is_sudden_death,
            isJacksDealerReserved: dbRoom.is_jacks_dealer_reserved,
            requiredPlayers: dbRoom.required_players,
            allowPauses: dbRoom.allow_pauses,
            turnDuration: dbRoom.turn_duration,
            status: dbRoom.status,
            players: [], 
            activeDeadline: dbRoom.active_deadline,
            adminMessage: dbRoom.admin_message,
            joinCode: dbRoom.join_code,
            createdAt: dbRoom.created_at,
            updatedAt: dbRoom.updated_at,
            version: dbRoom.version
        };
    },

    toDbInsert(domainRoom: Partial<Room>): DbRoomInsert {
        const result: any = {};
        if (domainRoom.name !== undefined) result.name = domainRoom.name;
        if (domainRoom.betAmount !== undefined) result.bet_amount = domainRoom.betAmount;
        if (domainRoom.ruleSet !== undefined) result.rule_set = domainRoom.ruleSet;
        if (domainRoom.isStrict !== undefined) result.is_strict = domainRoom.isStrict;
        if (domainRoom.isSuddenDeath !== undefined) result.is_sudden_death = domainRoom.isSuddenDeath;
        if (domainRoom.isJacksDealerReserved !== undefined) result.is_jacks_dealer_reserved = domainRoom.isJacksDealerReserved;
        if (domainRoom.requiredPlayers !== undefined) result.required_players = domainRoom.requiredPlayers;
        if (domainRoom.allowPauses !== undefined) result.allow_pauses = domainRoom.allowPauses;
        if (domainRoom.turnDuration !== undefined) result.turn_duration = domainRoom.turnDuration;
        if (domainRoom.status !== undefined) result.status = domainRoom.status;
        if (domainRoom.activeDeadline !== undefined) result.active_deadline = domainRoom.activeDeadline;
        if (domainRoom.adminMessage !== undefined) result.admin_message = domainRoom.adminMessage;
        if (domainRoom.joinCode !== undefined) result.join_code = domainRoom.joinCode;
        if (domainRoom.createdAt !== undefined) result.created_at = domainRoom.createdAt;
        if (domainRoom.updatedAt !== undefined) result.updated_at = domainRoom.updatedAt;
        if (domainRoom.version !== undefined) result.version = domainRoom.version;
        return result as DbRoomInsert;
    },

    toDbUpdate(domainRoom: Partial<Room>): DbRoomUpdate {
        return this.toDbInsert(domainRoom) as DbRoomUpdate;
    }
};

type DbPlayerRow = Database['public']['Tables']['room_players']['Row'];
type DbPlayerInsert = Database['public']['Tables']['room_players']['Insert'];
type DbPlayerUpdate = Database['public']['Tables']['room_players']['Update'];

export const RoomPlayerMapper = {
    toDomain(dbRow: DbPlayerRow): RoomPlayer {
        return {
            userId: dbRow.user_id,
            avatarId: dbRow.avatar_id,
            isReady: dbRow.is_ready || false,
            joinedAt: dbRow.joined_at
        };
    },

    toDbInsert(data: { roomId: string; userId: string | null; avatarId: string | null; isReady?: boolean }): DbPlayerInsert {
        return {
            room_id: data.roomId,
            user_id: data.userId,
            avatar_id: data.avatarId,
            is_ready: data.isReady ?? false,
            joined_at: new Date().toISOString()
        };
    },

    toDbUpdate(data: { isReady?: boolean }): DbPlayerUpdate {
        const result: any = {};
        if (data.isReady !== undefined) result.is_ready = data.isReady;
        return result;
    }
};

type DbSecretRow = Database['public']['Tables']['room_secrets']['Row'];
type DbSecretInsert = Database['public']['Tables']['room_secrets']['Insert'];
type DbSecretUpdate = Database['public']['Tables']['room_secrets']['Update'];

export const RoomSecretMapper = {
    toDomain(dbRow: DbSecretRow): RoomSecrets {
        return {
            roomId: dbRow.room_id,
            fullGameState: dbRow.full_game_state as unknown as FullGameState | null
        };
    },

    toDbInsert(roomId: string, fullGameState: FullGameState | null = null): DbSecretInsert {
        return {
            room_id: roomId,
            full_game_state: fullGameState as unknown as string
        };
    },

    toDbUpdate(fullGameState: FullGameState | null): DbSecretUpdate {
        return {
            full_game_state: fullGameState as unknown as string
        };
    }
};

type ResolveTableArgs = Database['public']['Functions']['resolve_game_table']['Args'];
type CreateRoomArgs = Database['public']['Functions']['create_room_with_billing']['Args'];
type JoinRoomArgs = Database['public']['Functions']['join_room_with_billing']['Args'];

export const RpcMapper = {
    toResolveTableArgs(params: {
        roomId: string;
        payouts: { userId: string; amount: number }[];
        usersToRemove: string[];
        playersToKick: string[];
        newStatus: string | null;
        newDeadline: number | null;
        adminMessage: string | null;
        deleteRoom: boolean;
    }): ResolveTableArgs {
        return {
            p_room_id: params.roomId,
            p_payouts: params.payouts as unknown as any,
            p_users_to_remove: params.usersToRemove,
            p_players_to_kick: params.playersToKick,
            p_new_room_status: params.newStatus as unknown as string,
            p_new_deadline: params.newDeadline as unknown as number,
            p_admin_message: params.adminMessage as unknown as string,
            p_delete_room: params.deleteRoom
        };
    },

    toCreateRoomArgs(params: {
        userId: string;
        playerId: string;
        roomId: string;
        betAmount: number;
        dbRoomInsert: any;
        avatarId: string | null;
    }): CreateRoomArgs {
        return {
            p_user_id: params.userId,
            p_player_id: params.playerId,
            p_room_id: params.roomId,
            p_bet_amount: params.betAmount,
            p_room_data: params.dbRoomInsert as unknown as any,
            p_avatar_id: params.avatarId ?? undefined
        };
    },

    toJoinRoomArgs(params: {
        userId: string;
        playerId: string;
        roomId: string;
        avatarId: string | null;
    }): JoinRoomArgs {
        return {
            p_user_id: params.userId,
            p_player_id: params.playerId,
            p_room_id: params.roomId,
            p_avatar_id: params.avatarId ?? undefined
        };
    }
};