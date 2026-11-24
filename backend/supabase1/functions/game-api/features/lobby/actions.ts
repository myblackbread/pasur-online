import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/core/database/database.types.ts";
import { BaseActionParams } from "@/core/types.ts";

import { RoomEntryResponse, SuccessResponse } from "@/shared/dto/responses.ts";
import { CreateRoomPayload, SearchRoomsFilters } from "@/shared/dto/requests.ts";
import { Room } from "@/shared/models/index.ts"; 
import { GameError, ErrorCode } from "@/shared/errors.ts";
import { GAME_CONFIG } from "@/shared/constants.ts";

import { getUser, processBilling, ensureAvatarExists } from "@/data/users/repository.ts";
import { 
    getRoomWithSecrets, 
    updateRoomState, 
    searchPublicRooms, 
    resetRoomForRematch, 
    setPlayerReady, 
    getRoomPlayers, 
    resetAllPlayersReady, 
    updateRoomDeadline, 
    kickAfkLobbyPlayers 
} from "@/data/rooms/repository.ts";
import { RoomMapper, RpcMapper } from "@/data/rooms/mapper.ts";

import { PasurGame } from "@/core/engine/PasurGame.ts";
import { createShuffledDeck } from "@/core/engine/deck.ts";
import { generateJoinCode, generateAvatarId } from "@/core/helpers.ts";

// ==========================================
// ⚙️ ПАРАМЕТРЫ ЭКШЕНОВ
// ==========================================

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

export interface SearchRoomsParams extends Omit<BaseActionParams, 'userId'> {
    filters: SearchRoomsFilters;
}

export interface ReturnToLobbyParams extends BaseActionParams {
    roomId: string;
}

export interface ResolveReadyTimeoutParams extends BaseActionParams {
    roomId: string;
}

// ==========================================
// 🚀 ЛОГИКА ЭКШЕНОВ
// ==========================================

export async function createRoomAction({ db, userId, payload }: CreateRoomParams): Promise<RoomEntryResponse> {
    if (!(GAME_CONFIG.ALLOWED_BETS as readonly number[]).includes(payload.betAmount)) {
        throw new GameError(ErrorCode.INVALID_ROOM_CONFIG);
    }

    const user = await getUser({ db, userId });
    const roomId = crypto.randomUUID();
    let avatarId: string | null = null;

    if (user?.settings?.isIncognito) {
        avatarId = await generateAvatarId({ userId, roomId });
        await ensureAvatarExists({ db, userId, avatarId });
    }

    const playerId = avatarId || userId;
    const { isPrivate, ...domainRoomFields } = payload;
    const joinCode = isPrivate ? generateJoinCode() : null;

    const dbRoomInsert = RoomMapper.toDbInsert({
        ...domainRoomFields,
        id: roomId,
        status: 'waiting',
        joinCode,
        turnDuration: payload.turnDuration || GAME_CONFIG.DEFAULT_TURN_DURATION,
        requiredPlayers: payload.requiredPlayers ?? 2,
        version: 1,
        createdAt: new Date().toISOString()
    });

    const rpcArgs = RpcMapper.toCreateRoomArgs({
        userId,
        playerId,
        roomId,
        betAmount: payload.betAmount,
        dbRoomInsert,
        avatarId
    });

    const { error } = await db.rpc('create_room_with_billing', rpcArgs);

    if (error) {
        if (error.message.includes('ERR_NOT_ENOUGH_MONEY')) throw new GameError(ErrorCode.NOT_ENOUGH_MONEY);
        throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return { success: true, roomId, playerId, joinCode };
}

export async function joinRoomAction({ db, userId, roomId, joinCode }: JoinRoomParams): Promise<RoomEntryResponse> {
    const { data: roomData, error: roomErr } = await db.from("rooms").select("join_code").eq("id", roomId).single();
    if (roomErr || !roomData) throw new GameError(ErrorCode.ROOM_NOT_FOUND);

    if (roomData.join_code && roomData.join_code !== joinCode) {
        throw new GameError(ErrorCode.UNAUTHORIZED); 
    }

    const user = await getUser({ db, userId });
    let avatarId: string | null = null;

    if (!roomData.join_code && user?.settings?.isIncognito) {
        avatarId = await generateAvatarId({ userId, roomId });
        await ensureAvatarExists({ db, userId, avatarId });
    }

    const playerId = avatarId || userId;

    const rpcArgs = RpcMapper.toJoinRoomArgs({
        userId,
        playerId,
        roomId,
        avatarId
    });

    const { error } = await db.rpc('join_room_with_billing', rpcArgs);

    if (error) {
        if (error.message.includes('ERR_ROOM_NOT_FOUND')) throw new GameError(ErrorCode.ROOM_NOT_FOUND);
        if (error.message.includes('ERR_ROOM_ALREADY_STARTED')) throw new GameError(ErrorCode.ROOM_ALREADY_STARTED);
        if (error.message.includes('ERR_ROOM_FULL')) throw new GameError(ErrorCode.ROOM_FULL);
        if (error.message.includes('ERR_NOT_ENOUGH_MONEY')) throw new GameError(ErrorCode.NOT_ENOUGH_MONEY);
        throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return { success: true, roomId, playerId };
}

export async function toggleReadyAction({ db, userId, roomId, isReady }: ToggleReadyParams): Promise<SuccessResponse> {
    const { room, secrets } = await getRoomWithSecrets({ db, roomId });
    if (room.status === 'playing' || room.status === 'finished') return { success: true };

    const player = room.players.find(p => p.userId === userId);
    if (!player) throw new GameError(ErrorCode.NOT_IN_ROOM);
    
    const playerId = player.avatarId || player.userId;
    if (!playerId) throw new GameError(ErrorCode.NOT_IN_ROOM);

    await setPlayerReady({ db, roomId, playerId, isReady });

    const allPlayers = await getRoomPlayers({ db, roomId });
    
    const isRoomFull = allPlayers.length === (room.requiredPlayers || GAME_CONFIG.DEFAULT_REQUIRED_PLAYERS);
    const isEveryoneReady = isRoomFull && allPlayers.every(p => p.isReady);

    if (isEveryoneReady) {
        let game: PasurGame;
        const playerIds = allPlayers.map(p => p.avatarId || p.userId) as string[];

        if (room.status === 'paused' && secrets.fullGameState) {
            game = PasurGame.restore({ config: room, state: secrets.fullGameState });
            game.startNewRound({ shuffledDeck: createShuffledDeck() });
        } else {
            game = PasurGame.createNew({ config: room, playerIds });
        }

        await resetAllPlayersReady({ db, roomId });

        await updateRoomState({
            db, roomId,
            status: 'playing',
            activeDeadline: Date.now() + room.turnDuration + game.getAnimationDuration(),
            secretState: game.getSecretState(),
            currentVersion: room.version
        });
    } else {
        let newDeadline = room.activeDeadline;
        if (room.status === 'paused' && isReady && !newDeadline) {
            newDeadline = Date.now() + GAME_CONFIG.DEFAULT_READY_DURATION;
        } else if (room.status === 'waiting' && isRoomFull && !newDeadline) {
            newDeadline = Date.now() + GAME_CONFIG.DEFAULT_READY_DURATION;
        }

        if (newDeadline !== room.activeDeadline) {
            await updateRoomDeadline({ db, roomId, currentVersion: room.version, newDeadline });
        }
    }

    return { success: true };
}

export async function searchRoomsAction({ db, filters }: SearchRoomsParams): Promise<{ success: boolean, rooms: Room[] }> {
    const rooms = await searchPublicRooms({ db, filters });
    return { success: true, rooms };
}

export async function devAddMoneyAction(params: { db: SupabaseClient<Database>, userId: string }): Promise<SuccessResponse> {
    const { db, userId } = params;
    if (Deno.env.get('ENVIRONMENT') === 'production') throw new GameError(ErrorCode.UNAUTHORIZED);

    await processBilling({ db, targetId: userId, amount: GAME_CONFIG.ECONOMY.DEV_MONEY_AMOUNT });
    return { success: true };
}

export async function returnToLobbyAction({ db, roomId }: ReturnToLobbyParams): Promise<SuccessResponse> {
    await resetRoomForRematch({ db, roomId });
    return { success: true };
}

export async function resolveReadyTimeoutAction({ db, roomId }: ResolveReadyTimeoutParams): Promise<SuccessResponse> {
    const { room } = await getRoomWithSecrets({ db, roomId });

    if (room.status !== 'waiting' && room.status !== 'paused') return { success: false };
    if (!room.activeDeadline || Date.now() < room.activeDeadline) return { success: false };

    const afkPlayers = room.players.filter(p => !p.isReady);
    if (afkPlayers.length === 0) return { success: true };

    if (room.status === 'paused') {
        await resetAllPlayersReady({ db, roomId });

        await updateRoomState({
            db, 
            roomId,
            status: 'paused',
            activeDeadline: null,
            currentVersion: room.version
        });
        return { success: true };
    }

    const afkIds = afkPlayers.map(p => (p.avatarId || p.userId) as string);
    await kickAfkLobbyPlayers({ db, room, afkPlayerIds: afkIds });

    return { success: true };
}