import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/core/database/database.types.ts";
import { BaseActionParams } from "@/core/types.ts";
import { SuccessResponse } from "@/shared/dto/responses.ts";
import { GameError, ErrorCode } from "@/shared/errors.ts";
import { GAME_CONFIG } from "@/shared/constants.ts";

import { getUser, banUser } from "@/data/users/repository.ts";
import {
    getRoomsByStatus,
    resolveTable,
    deleteRoomAndCreateTicket,
    resetRoomForRematch,
    updateRoomDeadline,
    resetAllPlayersReady,
    getRoomWithSecrets,
    kickAfkLobbyPlayers
} from "@/data/rooms/repository.ts";

// ==========================================
// ⚙️ ПАРАМЕТРЫ ЭКШЕНОВ
// ==========================================

export interface AdminDeleteUserParams extends BaseActionParams {
    /** ID пользователя, которого необходимо удалить (забанить) */
    uidToKill: string;
}

// ==========================================
// 🚀 ЛОГИКА ЭКШЕНОВ
// ==========================================

/**
 * Административное удаление пользователя.
 * Банит юзера и принудительно завершает все активные игры с его участием.
 */
export async function adminDeleteUserAction({ db, userId, uidToKill }: AdminDeleteUserParams): Promise<SuccessResponse> {
    const caller = await getUser({ db, userId });
    if (!caller?.isAdmin) throw new GameError(ErrorCode.NOT_ADMIN);
    if (!uidToKill) throw new GameError(ErrorCode.INVALID_REQUEST);

    const targetUser = await getUser({ db, userId: uidToKill });
    await banUser({ db, userId: uidToKill });

    if (!targetUser?.activeRooms?.length) return { success: true };

    for (const roomId of targetUser.activeRooms) {
        await resolveTable({ db, roomId, reason: 'banned', targetUserId: uidToKill });
    }

    return { success: true };
}

/**
 * Глобальный очиститель (Cron-job).
 * Выполняет автоматическое обслуживание комнат: удаляет зависшие игры, 
 * чистит неактивные лобби и возвращает завершенные матчи в состояние лобби.
 */
export async function runGlobalCleanupAction({
    db
}: {
    db: SupabaseClient<Database>;
}): Promise<SuccessResponse> {
    const now = Date.now();
    const expirationThreshold = now - GAME_CONFIG.ROOM_LIFETIME_MS;

    // 1. Очистка комнат НА ПАУЗЕ
    const pausedRooms = await getRoomsByStatus({ db, status: 'paused' });
    for (const room of pausedRooms) {
        const updatedAtMs = new Date(room.updatedAt).getTime();

        if (updatedAtMs < expirationThreshold) {
            const { secrets } = await getRoomWithSecrets({ db, roomId: room.id });
            await deleteRoomAndCreateTicket({ db, room, secrets });
            continue;
        }

        if (room.activeDeadline !== null && room.activeDeadline < now) {
            await updateRoomDeadline({ db, roomId: room.id, currentVersion: room.version, newDeadline: null });
            await resetAllPlayersReady({ db, roomId: room.id });
        }
    }

    // 2. Очистка ЗАВИСШИХ ИГР
    const playingRooms = await getRoomsByStatus({ db, status: 'playing' });
    for (const room of playingRooms) {
        if (room.activeDeadline !== null && room.activeDeadline < now) {
            const { secrets } = await getRoomWithSecrets({ db, roomId: room.id });
            const gameState = secrets.fullGameState;

            const afkPlayerId = gameState?.players[gameState.currentTurnIndex]?.playerId;

            if (afkPlayerId) {
                await resolveTable({ db, roomId: room.id, reason: 'timeout', targetUserId: afkPlayerId });
            } else {
                await resolveTable({ db, roomId: room.id, reason: 'cron_delete' });
            }
        }
    }

    // 3. Очистка ЛОББИ
    const waitingRooms = await getRoomsByStatus({ db, status: 'waiting' });
    for (const room of waitingRooms) {
        if (room.activeDeadline !== null && room.activeDeadline < now) {
            const afkPlayers = room.players.filter(p => !p.isReady);
            const afkPlayerIds = afkPlayers.map(p => (p.avatarId || p.userId) as string);

            if (afkPlayerIds.length > 0) {
                await kickAfkLobbyPlayers({ db, room, afkPlayerIds });
            }
        }
    }

    // 4. Автоматический возврат в лобби ЗАВЕРШЕННЫХ ИГР
    const finishedRooms = await getRoomsByStatus({ db, status: 'finished' });
    for (const room of finishedRooms) {
        if (room.activeDeadline !== null && room.activeDeadline < now) {
            await resetRoomForRematch({ db, roomId: room.id });
        }
    }

    return { success: true };
}