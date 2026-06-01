import { AdminDeleteUserParams, RunGlobalCleanupParams, SuccessResponse } from "../types/api.types.ts";
import { GameError, ErrorCode } from "../utils/errors.ts";
import { getUser, banUser } from "../repositories/user.repo.ts";
import { getRoomsByStatus, resolveTable, deleteRoomAndCreateTicket } from "../repositories/room.repo.ts";
import { toDbRoomUpdate } from "../utils/mappers.ts"; // <-- Добавляем импорт маппера
import { GAME_CONFIG } from "../config/constants.ts";

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

export async function runGlobalCleanupAction({ db }: RunGlobalCleanupParams): Promise<SuccessResponse> {
    const now = Date.now();

    // 1. Очистка комнат НА ПАУЗЕ
    const expirationThreshold = now - GAME_CONFIG.ROOM_LIFETIME_MS;
    const pausedRooms = await getRoomsByStatus({ db, status: 'paused' });
    
    for (const room of pausedRooms) {
        if (room.updatedAt !== null && room.updatedAt < expirationThreshold) {
            if (room.complaints && Object.keys(room.complaints).length > 0) {
                await deleteRoomAndCreateTicket({ db, room });
            } else {
                await resolveTable({ db, roomId: room.id, reason: 'cron_pause_timeout' });
            }
            continue; 
        }

        if (room.activeDeadline !== null && room.activeDeadline < now) {
            const resetPlayers = room.players.map(p => ({ ...p, isReady: false }));
            
            const dbUpdate = toDbRoomUpdate({
                players: resetPlayers, 
                activeDeadline: null
            });

            await db.from("rooms").update(dbUpdate).eq("id", room.id);
        }
    }

    // 2. Очистка ЗАВИСШИХ ИГР (playing)
    const playingRooms = await getRoomsByStatus({ db, status: 'playing' });
    
    for (const room of playingRooms) {
        if (room.activeDeadline !== null && room.activeDeadline < now) {
            const gameState = room.publicGameState;
            const players = gameState?.players || [];
            
            const afkPublicId = players[gameState?.currentTurnIndex || 0]?.id;
            
            if (afkPublicId) {
                await resolveTable({ db, roomId: room.id, reason: 'timeout', targetUserId: afkPublicId });
            } else {
                await resolveTable({ db, roomId: room.id, reason: 'cron_delete' });
            }
        }
    }

    // 3. Очистка ЛОББИ (waiting)
    const waitingRooms = await getRoomsByStatus({ db, status: 'waiting' });
    
    for (const room of waitingRooms) {
        if (room.activeDeadline !== null && room.activeDeadline < now) {
            const afkPlayers = room.players.filter(p => !p.isReady);
            
            for (const afk of afkPlayers) {
                await resolveTable({ db, roomId: room.id, reason: 'lobby_leave', targetUserId: afk.id });
            }
        }
    }

    return { success: true };
}