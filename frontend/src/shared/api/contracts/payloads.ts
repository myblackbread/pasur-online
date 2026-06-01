import { RoomDTO, RuleSetDTO } from './dto';

// ==========================================
// PAYLOADS (Данные, отправляемые на сервер)
// ==========================================

export interface CreateRoomPayload {
    name?: string;
    betAmount: number;
    ruleSet?: RuleSetDTO;
    isPrivate?: boolean;
    requiredPlayers?: number;
    isStrict?: boolean;
    isSuddenDeath?: boolean;
    isJacksDealerReserved?: boolean;
    allowPauses?: boolean;
    turnDuration?: number;
}

export interface SearchRoomsFiltersPayload {
    bet?: number;
    speed?: number;
    players?: number;
    ruleSet?: RuleSetDTO;
    isStrict?: boolean;
    isSuddenDeath?: boolean;
}

// ==========================================
// RESPONSES (Ответы сервера)
// ==========================================

export interface SuccessResponse {
    success: boolean;
}

export interface RoomEntryResponse extends SuccessResponse {
    roomId: string;
    publicUid: string;
    joinCode?: string | null;
}

export interface SearchRoomsResponse extends SuccessResponse {
    rooms: RoomDTO[];
}

export interface GetMyMaskResponse {
    mask: string | null;
}

// ==========================================
// КАРТА ЭКШЕНОВ API
// ==========================================

/**
 * Строгая карта всех доступных API-экшенов.
 */
export type ApiActionMap = {
    // --- LOBBY ACTIONS ---
    'secureCreateRoom': CreateRoomPayload;
    'secureJoinRoom': { roomId: string; joinCode?: string };
    'secureToggleReady': { roomId: string; isReady: boolean };
    'secureSearchRooms': SearchRoomsFiltersPayload;
    'secureRematch': { roomId: string };
    'secureResolveReadyTimeout': { roomId: string };
    
    // --- GAMEPLAY ACTIONS ---
    'securePlayCard': { roomId: string; cardId: string; targetCardIds: string[] };
    'secureLeaveRoom': { roomId: string };
    'reportAfk': { roomId: string };
    'secureGetMyMask': { roomId: string };
    'secureSendReaction': { roomId: string };
    
    // --- ADMIN & DEV ---
    'devAddMoney': Record<string, never>;
    'adminDeleteUser': { uidToKill: string };
};

/**
 * Словарь ответов API для каждого экшена.
 */
export type ApiResponseMap = {
    'secureCreateRoom': RoomEntryResponse;
    'secureJoinRoom': RoomEntryResponse;
    'secureSearchRooms': SearchRoomsResponse;
    'secureGetMyMask': GetMyMaskResponse;
    
    // Все остальные экшены возвращают стандартный SuccessResponse
    'secureToggleReady': SuccessResponse;
    'securePlayCard': SuccessResponse;
    'secureLeaveRoom': SuccessResponse;
    'reportAfk': SuccessResponse;
    'secureRematch': SuccessResponse;
    'secureResolveReadyTimeout': SuccessResponse;
    'secureSendReaction': SuccessResponse;
    'devAddMoney': SuccessResponse;
    'adminDeleteUser': SuccessResponse;
};