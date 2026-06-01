import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types.ts";
import { Room, RoomPlayer, RoomStatus, PublicGameState, FullGameState, RoomConfig } from "./models.types.ts";
import { PasurGame } from "../core/engine.ts";

/** Базовый интерфейс параметров, который наследуют (почти) все API-экшены. */
export interface BaseActionParams {
    db: SupabaseClient<Database>;
    userId: string; 
}

// ==========================================
// 📁 REPOSITORIES PARAMS (Строгая связь с репозиториями)
// ==========================================

export interface RepoRoomParams {
    db: SupabaseClient<Database>;
    roomId: string;
}

export interface GetRoomsByStatusParams {
    db: SupabaseClient<Database>;
    status: RoomStatus;
}

export interface CreateRoomRepoParams {
    db: SupabaseClient<Database>;
    roomData: Partial<Room>; 
    secretsData: { realUids: Record<string, string> };
}

export interface AddPlayerToRoomParams {
    db: SupabaseClient<Database>;
    roomId: string;
    userId: string;
    publicUid: string;
}

export interface SaveGameTurnParams {
    db: SupabaseClient<Database>;
    roomId: string;
    status: RoomStatus;
    publicState: PublicGameState;
    secretState: FullGameState;
    newDeadline: number | null;
    currentVersion: number;
    players?: RoomPlayer[];
}

export interface UpdateRoomPlayersAndStatusParams {
    db: SupabaseClient<Database>;
    roomId: string;
    players: RoomPlayer[];
    status: RoomStatus;
    activeDeadline?: number | null;
    publicState?: PublicGameState | null;
    secretState?: FullGameState | null;
}

export interface UpdateRoomComplaintParams {
    db: SupabaseClient<Database>;
    roomId: string;
    reporterId: string;
    suspectId: string;
}

export interface DeleteRoomAndCreateTicketParams {
    db: SupabaseClient<Database>;
    room: Room;
}

export type LeaveReason = 'surrender' | 'timeout' | 'banned' | 'lobby_leave' | 'cron_delete' | 'cron_pause_timeout' | 'match_finished';

export interface ResolveTableParams {
    db: SupabaseClient<Database>;
    roomId: string;
    reason: LeaveReason;
    targetUserId?: string | null;
    finalGame?: PasurGame;
}

export interface GetUserParams {
    db: SupabaseClient<Database>;
    userId: string;
}

export interface BanUserParams {
    db: SupabaseClient<Database>;
    userId: string;
}

export interface IncrementBalanceParams {
    db: SupabaseClient<Database>;
    userId: string;
    amount: number;
}

export interface UpdateActiveRoomsParams {
    db: SupabaseClient<Database>;
    userId: string;
    roomId: string;
    action: 'add' | 'remove';
}

export interface CreateTicketParams {
    db: SupabaseClient<Database>;
    reporterId: string;
    suspectId: string;
    matchSnapshot: Record<string, unknown>; // Строго без any!
}

// ==========================================
// 🚪 LOBBY ACTIONS (Лобби и Комнаты)
// ==========================================

export interface CreateRoomPayload extends RoomConfig {
    name: string;
    // isPrivate оставлен только в Payload (клиент передает этот флаг для логики создания анонимных комнат),
    // но в БД он не попадает, так как его нет в мапперах.
    isPrivate: boolean; 
}

export interface CreateRoomParams extends BaseActionParams {
    payload: CreateRoomPayload;
}

export interface JoinRoomParams extends BaseActionParams {
    roomId: string;
    joinCode?: string;
}

export interface ToggleReadyParams extends BaseActionParams {
    roomId: string;
    isReady: boolean;
}

export interface SearchRoomsFilters extends Partial<RoomConfig> {
    bet?: number;
    speed?: number;
    players?: number;
}

export interface SearchRoomsParams extends Omit<BaseActionParams, 'userId'> {
    filters: SearchRoomsFilters;
}

// ==========================================
// 🎲 GAMEPLAY ACTIONS (Игровой процесс)
// ==========================================

export interface PlayCardParams extends BaseActionParams {
    roomId: string;
    cardId: string;
    targetCardIds: string[];
}

export interface LeaveRoomParams extends BaseActionParams {
    roomId: string;
}

export interface ReportAfkParams extends BaseActionParams {
    roomId: string;
}

export interface AnswerPauseParams extends BaseActionParams {
    roomId: string;
    accept: boolean;
}

export interface NextRoundParams extends BaseActionParams {
    roomId: string;
}

// ==========================================
// 🛡️ ADMIN & CRON ACTIONS (Системные экшены)
// ==========================================

export interface AdminDeleteUserParams extends BaseActionParams {
    uidToKill: string;
}

export interface RunGlobalCleanupParams {
    db: SupabaseClient<Database>;
}

// ==========================================
// 📤 СТАНДАРТНЫЕ ОТВЕТЫ (Responses)
// ==========================================

export interface SuccessResponse {
    success: boolean;
}

export interface RoomEntryResponse extends SuccessResponse {
    roomId: string;
    publicUid: string; 
    joinCode?: string | null;
}

// === ДОПОЛНИТЕЛЬНЫЕ LOBBY ACTIONS ===
export interface RematchParams extends BaseActionParams {
    roomId: string;
}

export interface ResolveReadyTimeoutParams extends BaseActionParams {
    roomId: string;
}

// === ДОПОЛНИТЕЛЬНЫЕ GAMEPLAY ACTIONS ===
export interface ProposePauseParams extends BaseActionParams {
    roomId: string;
}

export interface ResolvePauseTimeoutParams extends BaseActionParams {
    roomId: string;
}

export interface GetMyMaskParams extends BaseActionParams {
    roomId: string;
}

export interface SendReactionParams extends BaseActionParams {
    roomId: string;
}