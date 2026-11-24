import { RoomDTO, UserDTO, RoomPlayerDTO, PublicGameStateDTO, RoomComplaintDTO, UserSettingsDTO } from './contracts/dto';

/**
 * Превращает сырую строку из базы данных (snake_case) 
 * в валидный доменный объект комнаты (camelCase)
 */
export function mapRoomFromDB(dbRoom: any): RoomDTO {
    return {
        id: dbRoom.id,
        name: dbRoom.name,
        betAmount: dbRoom.bet_amount,
        ruleSet: dbRoom.rule_set,
        isStrict: dbRoom.is_strict,
        isSuddenDeath: dbRoom.is_sudden_death,
        isJacksDealerReserved: dbRoom.is_jacks_dealer_reserved || false,
        requiredPlayers: dbRoom.required_players,
        allowPauses: dbRoom.allow_pauses,
        turnDuration: dbRoom.turn_duration,
        status: dbRoom.status,
        players: dbRoom.players as RoomPlayerDTO[],
        publicGameState: dbRoom.public_game_state as PublicGameStateDTO | null,
        complaints: dbRoom.complaints as Record<string, RoomComplaintDTO[]> | null,
        joinCooldowns: dbRoom.join_cooldowns as Record<string, number> | null,
        activeDeadline: dbRoom.active_deadline,
        adminMessage: dbRoom.admin_message,
        joinCode: dbRoom.join_code,
        createdAt: dbRoom.created_at,
        updatedAt: dbRoom.updated_at,
        version: dbRoom.version
    };
}

/**
 * Превращает сырую строку юзера из базы данных (snake_case)
 * в валидный доменный объект пользователя (camelCase)
 */
export function mapUserFromDB(dbUser: any): UserDTO {
    return {
        id: dbUser.id,
        displayName: dbUser.display_name,
        balance: dbUser.balance,
        isAdmin: dbUser.is_admin || false,
        isDeleted: dbUser.is_deleted || false,
        activeRooms: dbUser.active_rooms || [],
        settings: dbUser.settings as UserSettingsDTO | null,
    };
}