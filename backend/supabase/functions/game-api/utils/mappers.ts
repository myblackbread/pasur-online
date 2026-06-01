import { Database } from "../types/database.types.ts";
import { Room, RoomSecrets, User, RoomPlayer, PublicGameState, FullGameState, RoomComplaint, UserSettings } from "../types/models.types.ts";

type DbRoom = Database['public']['Tables']['rooms']['Row'];
type DbRoomInsert = Database['public']['Tables']['rooms']['Insert'];
type DbRoomUpdate = Database['public']['Tables']['rooms']['Update'];

type DbRoomSecrets = Database['public']['Tables']['room_secrets']['Row'];
type DbUser = Database['public']['Tables']['users']['Row'];

// ==========================================
// 📥 ИЗ БД В ДОМЕН (snake_case -> camelCase)
// ==========================================

export function toDomainRoom(dbRoom: DbRoom): Room {
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
        players: dbRoom.players as unknown as RoomPlayer[],
        publicGameState: dbRoom.public_game_state as unknown as PublicGameState | null,
        complaints: dbRoom.complaints as unknown as Record<string, RoomComplaint[]> | null,
        joinCooldowns: dbRoom.join_cooldowns as unknown as Record<string, number> | null,
        activeDeadline: dbRoom.active_deadline,
        adminMessage: dbRoom.admin_message,
        joinCode: dbRoom.join_code,
        createdAt: dbRoom.created_at,
        updatedAt: dbRoom.updated_at,
        version: dbRoom.version
    };
}

export function toDomainRoomSecrets(dbSecrets: DbRoomSecrets): RoomSecrets {
    return {
        roomId: dbSecrets.room_id,
        fullGameState: dbSecrets.full_game_state as unknown as FullGameState | null,
        realUids: dbSecrets.real_uids as unknown as Record<string, string> | null,
    };
}

export function toDomainUser(dbUser: DbUser): User {
    return {
        id: dbUser.id,
        displayName: dbUser.display_name,
        balance: dbUser.balance,
        isAdmin: dbUser.is_admin,
        isDeleted: dbUser.is_deleted,
        activeRooms: dbUser.active_rooms,
        settings: dbUser.settings as unknown as UserSettings | null,
    };
}

// ==========================================
// 📤 ИЗ ДОМЕНА В БД (camelCase -> snake_case)
// ==========================================

export function toDbRoomInsert(domainRoom: Partial<Room>): DbRoomInsert {
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
    if (domainRoom.players !== undefined) result.players = domainRoom.players as any;
    if (domainRoom.publicGameState !== undefined) result.public_game_state = domainRoom.publicGameState as any;
    if (domainRoom.complaints !== undefined) result.complaints = domainRoom.complaints as any;
    if (domainRoom.joinCooldowns !== undefined) result.join_cooldowns = domainRoom.joinCooldowns as any;
    if (domainRoom.activeDeadline !== undefined) result.active_deadline = domainRoom.activeDeadline;
    if (domainRoom.adminMessage !== undefined) result.admin_message = domainRoom.adminMessage;
    if (domainRoom.joinCode !== undefined) result.join_code = domainRoom.joinCode;
    if (domainRoom.createdAt !== undefined) result.created_at = domainRoom.createdAt;
    if (domainRoom.updatedAt !== undefined) result.updated_at = domainRoom.updatedAt;
    if (domainRoom.version !== undefined) result.version = domainRoom.version;
    
    return result as DbRoomInsert;
}

export function toDbRoomUpdate(domainRoom: Partial<Room>): DbRoomUpdate {
    return toDbRoomInsert(domainRoom) as DbRoomUpdate;
}