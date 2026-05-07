import { resolveTable } from "./tableManager.ts";
import { GAME_CONFIG } from "../constants.ts";

export async function runGlobalCleanup(adminDb: any) {
    const now = Date.now();

    // 1. Очистка мертвых комнат в ожидании / на паузе
    const { data: readyRooms } = await adminDb.from('rooms')
        .select('*')
        .in('status', ['ready_check', 'ready_check_resume', 'paused'])
        .lt('ready_deadline', now);

    if (readyRooms) {
        for (const room of readyRooms) {
            if (room.status === 'paused') {
                // Если пауза 24 часа истекла, Эскроу проверяет счет и списывает штрафы (УДАЛЕНИЕ)
                await resolveTable(adminDb, room.id, 'cron_pause_timeout'); 
            } else if (room.status === 'ready_check_resume') {
                // 🟢 ФИКС: 60 сек пинга истекли. Возвращаем в паузу, доставая оригинальный 24ч таймер из заначки!
                const resetPlayers = room.players?.map((p: any) => ({ ...p, isReady: false })) || [];
                
                // На случай аномалий БД, если turn_deadline пуст, даем час
                const restoredDeadline = room.turn_deadline || (Date.now() + 3600000); 

                await adminDb.from("rooms").update({
                    status: 'paused',
                    players: resetPlayers,
                    ready_deadline: restoredDeadline, // Восстановили старый таймер
                    turn_deadline: null               // Очистили карман
                }).eq("id", room.id);
            } else {
                // Обычное лобби: кикаем только АФК игроков
                const afkPlayers = room.players?.filter((p: any) => !p.isReady) || [];
                for (const afk of afkPlayers) {
                    await resolveTable(adminDb, room.id, 'lobby_leave', afk.id);
                }
            }
        }
    }

    // 2. Очистка зависших игр (AFK таймауты на ход)
    const { data: playingRooms } = await adminDb.from('rooms')
        .select('*')
        .in('status', ['playing', 'pause_requested'])
        .lt('turn_deadline', now);

    if (playingRooms) {
        for (const room of playingRooms) {
            if (room.status === 'pause_requested') {
                // Крон отменяет запрос на паузу, если второй игрок проигнорировал
                await adminDb.from("rooms").update({
                    status: 'playing', 
                    pause_proposals: [], 
                    turn_deadline: Date.now() + (room.turn_duration || GAME_CONFIG.DEFAULT_TURN_DURATION)
                }).eq("id", room.id);
            } else {
                const afkPublicId = room.game_state?.players?.[room.game_state?.currentTurnIndex || 0]?.id;
                if (afkPublicId) {
                    await resolveTable(adminDb, room.id, 'timeout', afkPublicId);
                } else {
                    await resolveTable(adminDb, room.id, 'cron_delete');
                }
            }
        }
    }

    // 3. Защита от вечно заблокированных столов
    const { data: stuckRooms } = await adminDb.from('rooms')
        .select('id').eq('status', 'resolving')
        .lt('updated_at', now - 300000); // зависли больше чем на 5 минут
        
    if (stuckRooms) {
        for (const room of stuckRooms) {
            await adminDb.from("rooms").delete().eq("id", room.id);
        }
    }

    return { success: true };
}