import { CreateRoomParams, JoinRoomParams, ToggleReadyParams, SearchRoomsParams, RoomEntryResponse, SuccessResponse, RematchParams, ResolveReadyTimeoutParams } from "../types/api.types.ts";
import { GameError, ErrorCode } from "../utils/errors.ts";
import { getUser, incrementBalance, updateActiveRooms } from "../repositories/user.repo.ts";
import { createRoom, getRoomWithSecrets, addPlayerToRoom, updateRoomPlayersAndStatus, searchPublicRooms, resolveTable } from "../repositories/room.repo.ts";
import { PasurGame } from "../core/engine.ts";
import { GAME_CONFIG } from "../config/constants.ts";
import { Room, RoomStatus } from "../types/models.types.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types.ts";
import { generateJoinCode } from "../utils/helpers.ts";
import { createShuffledDeck } from "../core/deck.ts";

export async function createRoomAction({ db, userId, payload }: CreateRoomParams): Promise<RoomEntryResponse> {

    if (!(GAME_CONFIG.ALLOWED_BETS as readonly number[]).includes(payload.betAmount)) throw new GameError(ErrorCode.INVALID_ROOM_CONFIG);

    const user = await getUser({ db, userId });
    if (!user) throw new GameError(ErrorCode.USER_NOT_FOUND);
    if ((user.balance || 0) < payload.betAmount) throw new GameError(ErrorCode.NOT_ENOUGH_MONEY);

    const isIncognito = !!user?.settings?.isIncognito;
    const publicUid = isIncognito ? `anon_${Math.random().toString(36).substring(2, 12)}` : userId;

    await incrementBalance({ db, userId, amount: -payload.betAmount });

    const { isPrivate, ...domainRoomFields } = payload;

    const joinCode = isPrivate ? generateJoinCode() : null;

    const roomId = await createRoom({
        db,
        roomData: {
            ...domainRoomFields,
            status: 'waiting',
            players: [{ id: publicUid, isReady: false }],
            joinCode,
            turnDuration: payload.turnDuration || GAME_CONFIG.DEFAULT_TURN_DURATION,
            requiredPlayers: payload.requiredPlayers ?? 2,
            isStrict: payload.isStrict ?? false,
            isSuddenDeath: payload.isSuddenDeath ?? false,
            isJacksDealerReserved: payload.isJacksDealerReserved ?? false,
            allowPauses: payload.allowPauses ?? true,
            version: 1,
            updatedAt: Date.now(),
            ruleSet: payload.ruleSet || 'local'
        },
        secretsData: { realUids: { [publicUid]: userId } }
    });

    await updateActiveRooms({ db, userId, roomId, action: 'add' });

    return { success: true, roomId, publicUid, joinCode };
}

export async function joinRoomAction({ db, userId, roomId, joinCode }: JoinRoomParams): Promise<RoomEntryResponse> {

    const { room, secrets } = await getRoomWithSecrets({ db, roomId });
    const user = await getUser({ db, userId });

    if (room.joinCode && room.joinCode !== joinCode) {
        throw new GameError(ErrorCode.UNAUTHORIZED); 
    }

    const cooldowns = room.joinCooldowns || {};
    if (cooldowns[userId] && cooldowns[userId] > Date.now()) {
        throw new GameError(ErrorCode.ON_COOLDOWN);
    }

    const realUids = secrets.realUids || {};
    let publicUid = Object.keys(realUids).find(key => realUids[key] === userId);

    if (publicUid) {
        return { success: true, roomId, publicUid };
    }

    if (room.status !== 'waiting') throw new GameError(ErrorCode.ROOM_ALREADY_STARTED);
    if (room.players.length >= (room.requiredPlayers || GAME_CONFIG.DEFAULT_REQUIRED_PLAYERS)) throw new GameError(ErrorCode.ROOM_FULL);
    if ((user?.balance || 0) < room.betAmount) throw new GameError(ErrorCode.NOT_ENOUGH_MONEY);

    const isIncognito = !room.joinCode && user?.settings?.isIncognito;
    publicUid = isIncognito ? `anon_${Math.random().toString(36).substring(2, 12)}` : userId;

    await incrementBalance({ db, userId, amount: -room.betAmount });
    await updateActiveRooms({ db, userId, roomId, action: 'add' });

    await addPlayerToRoom({ db, roomId, userId, publicUid });

    return { success: true, roomId, publicUid };
}

export async function toggleReadyAction({ db, userId, roomId, isReady }: ToggleReadyParams): Promise<SuccessResponse> {

    const { room, secrets } = await getRoomWithSecrets({ db, roomId });
    if (room.status === 'playing' || room.status === 'finished') return { success: true };

    const realUids = secrets.realUids || {};
    const publicUid = Object.keys(realUids).find(key => realUids[key] === userId);
    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    const players = room.players;
    const updatedPlayers = players.map(p => p.id === publicUid ? { ...p, isReady } : p);
    const allReady = updatedPlayers.length === (room.requiredPlayers || GAME_CONFIG.DEFAULT_REQUIRED_PLAYERS) && updatedPlayers.every(p => p.isReady);

    if (allReady) {
        const gameConfig = {
            playerIds: updatedPlayers.map(p => p.id),
            ruleSet: room.ruleSet || 'local',
            isStrict: room.isStrict || false,
            isSuddenDeath: room.isSuddenDeath || false,
            isJacksDealerReserved: room.isJacksDealerReserved || false
        };

        let game: PasurGame;

        if (room.status === 'paused') {
            // Восстанавливаем игру из секретов для нового раунда
            game = new PasurGame({ ...gameConfig, skipInit: true });
            if (secrets.fullGameState) game.state = secrets.fullGameState;
            
            // Запускаем следующий раунд
            game.startNewRound({ shuffledDeck: createShuffledDeck() });
        } else {
            // Новая игра из лобби
            game = new PasurGame(gameConfig);
        }

        await updateRoomPlayersAndStatus({
            db, roomId,
            players: updatedPlayers.map(p => ({ ...p, isReady: false })),
            status: 'playing',
            activeDeadline: Date.now() + GAME_CONFIG.DEFAULT_TURN_DURATION + game.getAnimationDuration(),
            publicState: game.getPublicState(),
            secretState: game.getSecretState()
        });
    } else {
        let newDeadline = room.activeDeadline;
        
        // Ставим таймер ТОЛЬКО если его еще нет (не даем бесконечно продлевать)
        if (room.status === 'paused' && isReady && !newDeadline) {
            newDeadline = Date.now() + GAME_CONFIG.DEFAULT_READY_DURATION;
        } else if (room.status === 'waiting' && updatedPlayers.length === (room.requiredPlayers || GAME_CONFIG.DEFAULT_REQUIRED_PLAYERS) && !newDeadline) {
            newDeadline = Date.now() + GAME_CONFIG.DEFAULT_READY_DURATION;
        }

        await updateRoomPlayersAndStatus({
            db, roomId,
            players: updatedPlayers,
            status: room.status as RoomStatus,
            activeDeadline: newDeadline
        });
    }

    return { success: true };
}

export async function searchRoomsAction({ db, filters }: SearchRoomsParams): Promise<{ success: boolean, rooms: Room[] }> {
    const rooms = await searchPublicRooms({ db, filters });
    return { success: true, rooms };
}

// ==========================================
// ДОПОЛНИТЕЛЬНЫЕ ЭКШЕНЫ ЛОББИ
// ==========================================

export async function devAddMoneyAction(params: { db: SupabaseClient<Database>, userId: string }): Promise<SuccessResponse> {
    const { db, userId } = params;
    if (Deno.env.get('ENVIRONMENT') === 'production') throw new GameError(ErrorCode.UNAUTHORIZED);

    await incrementBalance({ db, userId, amount: GAME_CONFIG.ECONOMY.DEV_MONEY_AMOUNT });
    return { success: true };
}

export async function rematchAction({ db, userId, roomId }: RematchParams): Promise<SuccessResponse> {
    const { room, secrets } = await getRoomWithSecrets({ db, roomId });
    if (room.status !== 'finished') throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    const realUids = secrets.realUids || {};
    const publicUid = Object.keys(realUids).find(key => realUids[key] === userId);
    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    const currentPlayer = room.players.find(p => p.id === publicUid);
    if (currentPlayer?.isReady) return { success: true };

    const user = await getUser({ db, userId });
    if ((user?.balance || 0) < room.betAmount) throw new GameError(ErrorCode.NOT_ENOUGH_MONEY);

    await incrementBalance({ db, userId, amount: -room.betAmount });
    await updateActiveRooms({ db, userId, roomId, action: 'add' });

    const updatedPlayers = room.players.map(p => p.id === publicUid ? { ...p, isReady: true } : p);
    const allReady = updatedPlayers.length === (room.requiredPlayers || GAME_CONFIG.DEFAULT_REQUIRED_PLAYERS) && updatedPlayers.every(p => p.isReady);

    if (allReady) {
        // Инициализация через единый объект параметров
        const game = new PasurGame({
            playerIds: updatedPlayers.map(p => p.id),
            ruleSet: room.ruleSet || 'local',
            isStrict: room.isStrict || false,
            isSuddenDeath: room.isSuddenDeath || false,
            isJacksDealerReserved: room.isJacksDealerReserved || false
        });

        await updateRoomPlayersAndStatus({
            db, roomId,
            players: updatedPlayers.map(p => ({ ...p, isReady: false })),
            status: 'playing',
            activeDeadline: Date.now() + GAME_CONFIG.DEFAULT_TURN_DURATION + game.getAnimationDuration(),
            publicState: game.getPublicState(),
            secretState: game.getSecretState()
        });
    } else {
        await updateRoomPlayersAndStatus({ db, roomId, players: updatedPlayers, status: room.status });
    }

    return { success: true };
}

export async function resolveReadyTimeoutAction({ db, roomId }: ResolveReadyTimeoutParams): Promise<SuccessResponse> {
    const { room } = await getRoomWithSecrets({ db, roomId });

    // Проверяем, что комната в состоянии ожидания готовности и время вышло
    if (room.status !== 'waiting' && room.status !== 'paused') return { success: false };
    if (!room.activeDeadline || Date.now() < room.activeDeadline) return { success: false };

    const afkPlayers = room.players.filter(p => !p.isReady);
    if (afkPlayers.length === 0) return { success: true };

    if (room.status === 'paused') {
        const resetPlayers = room.players.map(p => ({ ...p, isReady: false }));
        await updateRoomPlayersAndStatus({
            db, roomId,
            players: resetPlayers,
            status: 'paused',
            activeDeadline: null
        });
        return { success: true };
    }

    // Если это лобби, кикаем AFK игроков
    for (const afk of afkPlayers) {
        await resolveTable({ db, roomId, reason: 'lobby_leave', targetUserId: afk.id });
    }

    return { success: true };
}