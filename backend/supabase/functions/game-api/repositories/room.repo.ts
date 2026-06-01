import { GameError, ErrorCode } from "../utils/errors.ts";
import { incrementBalance, updateActiveRooms } from "./user.repo.ts";
import { createReviewTicket } from "./review.repo.ts";
import { GAME_CONFIG } from "../config/constants.ts";
import { Room, RoomSecrets, RoomPlayer, RoomComplaint } from "../types/models.types.ts";
import {
    SearchRoomsParams,
    RepoRoomParams,
    GetRoomsByStatusParams,
    CreateRoomRepoParams,
    AddPlayerToRoomParams,
    SaveGameTurnParams,
    UpdateRoomPlayersAndStatusParams,
    UpdateRoomComplaintParams,
    DeleteRoomAndCreateTicketParams,
    ResolveTableParams
} from "../types/api.types.ts";
import { toDomainRoom, toDomainRoomSecrets, toDbRoomInsert, toDbRoomUpdate } from "../utils/mappers.ts";

// ==========================================
// 🔍 ЧТЕНИЕ ДАННЫХ
// ==========================================

export async function getRoomWithSecrets({ db, roomId }: RepoRoomParams): Promise<{ room: Room; secrets: RoomSecrets }> {
    const { data: roomData, error: roomErr } = await db.from("rooms").select("*").eq("id", roomId).single();
    const { data: secData, error: secErr } = await db.from("room_secrets").select("*").eq("room_id", roomId).single();

    if (roomErr || secErr || !roomData || !secData) throw new GameError(ErrorCode.ROOM_NOT_FOUND);

    return {
        room: toDomainRoom(roomData),
        secrets: toDomainRoomSecrets(secData)
    };
}

export async function getRoomsByStatus({ db, status }: GetRoomsByStatusParams): Promise<Room[]> {
    const { data, error } = await db.from("rooms").select("*").eq("status", status);
    if (error || !data) return [];

    return data.map(toDomainRoom);
}

export async function searchPublicRooms({ db, filters }: SearchRoomsParams): Promise<Room[]> {
    let query = db.from('rooms').select('*').eq('status', 'waiting').is('join_code', null);

    if (filters.bet !== undefined) query = query.eq('bet_amount', filters.bet);
    if (filters.speed !== undefined) query = query.eq('turn_duration', filters.speed);
    if (filters.players !== undefined) query = query.eq('required_players', filters.players);
    if (filters.ruleSet) query = query.eq('rule_set', filters.ruleSet);
    if (filters.isStrict !== undefined) query = query.eq('is_strict', filters.isStrict);
    if (filters.isSuddenDeath !== undefined) query = query.eq('is_sudden_death', filters.isSuddenDeath);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);

    return data.map(toDomainRoom);
}

// ==========================================
// ✍️ ЗАПИСЬ И ОБНОВЛЕНИЕ
// ==========================================

export async function createRoom({ db, roomData, secretsData }: CreateRoomRepoParams): Promise<string> {

    const dbInsertData = toDbRoomInsert({
        ...roomData,
        createdAt: Date.now()
    });

    const { data: room, error: roomErr } = await db.from('rooms')
        .insert(dbInsertData)
        .select('id').single();

    if (roomErr || !room) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);

    await db.from('room_secrets').insert({
        room_id: room.id,
        real_uids: secretsData.realUids as any
    });

    return room.id;
}

export async function addPlayerToRoom({ db, roomId, userId, publicUid }: AddPlayerToRoomParams): Promise<void> {
    const { room, secrets } = await getRoomWithSecrets({ db, roomId });

    const newPlayers: RoomPlayer[] = [...room.players, { id: publicUid, isReady: false }];
    const newSecrets: Record<string, string> = { ...secrets.realUids, [publicUid]: userId };

    const dbRoomUpdate = toDbRoomUpdate({ players: newPlayers });
    await db.from("rooms").update(dbRoomUpdate).eq("id", roomId);

    await db.from("room_secrets").update({
        real_uids: newSecrets as any
    }).eq("room_id", roomId);
}

export async function saveGameTurn({ db, roomId, status, publicState, secretState, newDeadline, currentVersion, players }: SaveGameTurnParams) {

    await db.from("room_secrets").update({ full_game_state: secretState as any }).eq("room_id", roomId);

    const dbRoomUpdate = toDbRoomUpdate({
        status: status,
        publicGameState: publicState,
        activeDeadline: newDeadline,
        players: players,
        version: currentVersion + 1
    });

    const { data, error } = await db.from("rooms")
        .update(dbRoomUpdate)
        .eq("id", roomId)
        .eq("version", currentVersion)
        .select("id").single();

    if (error || !data) throw new GameError(ErrorCode.STATE_OUTDATED);
}

export async function updateRoomPlayersAndStatus({ db, roomId, players, status, activeDeadline, publicState, secretState }: UpdateRoomPlayersAndStatusParams) {

    if (secretState) {
        await db.from("room_secrets").update({ full_game_state: secretState as any }).eq("room_id", roomId);
    }

    const dbUpdateData = toDbRoomUpdate({
        players: players,
        status: status,
        activeDeadline: activeDeadline,
        publicGameState: publicState
    });

    await db.from("rooms").update(dbUpdateData).eq("id", roomId);
}

export async function updateRoomComplaint({ db, roomId, reporterId, suspectId }: UpdateRoomComplaintParams) {
    const { room } = await getRoomWithSecrets({ db, roomId });

    const complaints: Record<string, RoomComplaint[]> = room.complaints || {};
    if (!complaints[reporterId]) complaints[reporterId] = [];

    complaints[reporterId].push({ suspect: suspectId, timestamp: Date.now() });

    const dbRoomUpdate = toDbRoomUpdate({ complaints });

    await db.from("rooms").update(dbRoomUpdate).eq("id", roomId);
}

export async function deleteRoomAndCreateTicket({ db, room }: DeleteRoomAndCreateTicketParams) {
    const complaints: Record<string, RoomComplaint[]> = room.complaints || {};

    const reporterId = Object.keys(complaints)[0];
    if (reporterId && complaints[reporterId].length > 0) {
        const suspectId = complaints[reporterId][0].suspect;

        await createReviewTicket({
            db, reporterId, suspectId,
            matchSnapshot: {
                scores: room.publicGameState?.matchScores,
                round: room.publicGameState?.roundNumber,
                bet: room.betAmount
            }
        });
    }

    await resolveTable({ db, roomId: room.id, reason: 'cron_pause_timeout' });
}

// ==========================================
// ⚖️ RESOLVE TABLE (Закрытие игры и расчеты)
// ==========================================

export async function resolveTable({ db, roomId, reason, targetUserId, finalGame }: ResolveTableParams) {
    // 1. Блокируем комнату, меняя статус на finished (запрос в БД принимает snake_case, но тут просто строка)
    const { data: lockData, error: lockErr } = await db.from("rooms")
        .update({ status: 'finished' })
        .eq("id", roomId)
        .neq("status", 'finished')
        .select("*").single();

    if (lockErr || !lockData) return;

    // <-- МАППИМ РЕЗУЛЬТАТ! Теперь lockRoom — это чистый camelCase-объект Room
    const lockRoom = toDomainRoom(lockData);

    // <-- getRoomWithSecrets уже возвращает нам camelCase, так что берем realUids
    const { secrets } = await getRoomWithSecrets({ db, roomId });
    const realUids = secrets.realUids || {};

    const payout = async (userId: string, amount: number) => {
        if (amount > 0) await incrementBalance({ db, userId, amount });
        await updateActiveRooms({ db, userId, roomId, action: 'remove' });
    };

    // --- СЦЕНАРИЙ 1: ЛОББИ ---
    if (reason === 'lobby_leave' && targetUserId) {
        const realId = realUids[targetUserId];
        if (realId) await payout(realId, lockRoom.betAmount);

        const remainingPlayers = lockRoom.players.filter(p => p.id !== targetUserId);
        delete realUids[targetUserId];

        if (remainingPlayers.length === 0) {
            await db.from("rooms").delete().eq("id", roomId);
        } else {
            await db.from("room_secrets").update({ real_uids: realUids as any }).eq("room_id", roomId);

            // ➕ ДОБАВЛЯЕМ КУЛДАУН ИГРОКУ
            const joinCooldowns = lockRoom.joinCooldowns || {};
            if (realId) {
                joinCooldowns[realId] = Date.now() + GAME_CONFIG.JOIN_COOLDOWN_MS;
            }

            const dbRoomUpdate = toDbRoomUpdate({
                status: 'waiting',
                players: remainingPlayers,
                activeDeadline: null,
                joinCooldowns: joinCooldowns
            });
            await db.from("rooms").update(dbRoomUpdate).eq("id", roomId);
        }
        return;
    }

    // --- СЦЕНАРИЙ 2: ЕСТЕСТВЕННЫЙ КОНЕЦ МАТЧА ---
    if (reason === 'match_finished' && finalGame) {
        const winners = lockRoom.players.filter(p => {
            const gp = finalGame.state.players.find(g => g.id === p.id);
            return gp?.teamId === finalGame.state.matchWinnerTeamId;
        });

        // <-- betAmount и requiredPlayers
        const winAmount = calculateWinPayout(lockRoom.betAmount, lockRoom.requiredPlayers || 2, winners.length);

        for (const realId of Object.values(realUids)) await updateActiveRooms({ db, userId: realId, roomId, action: 'remove' });
        for (const w of winners) if (realUids[w.id]) await incrementBalance({ db, userId: realUids[w.id], amount: winAmount });

        const resetPlayers = lockRoom.players.map(p => ({ ...p, isReady: false }));

        // <-- Используем маппер
        const dbRoomUpdate = toDbRoomUpdate({
            status: 'waiting',
            players: resetPlayers,
            publicGameState: null,
            activeDeadline: null
        });
        await db.from("rooms").update(dbRoomUpdate).eq("id", roomId);

        return;
    }

    // --- СЦЕНАРИЙ 3: ТАЙМАУТ ПАУЗЫ (CRON) ИЛИ ОТМЕНА ---
    if (reason === 'cron_pause_timeout' || reason === 'cron_delete') {
        const refundAmount = lockRoom.betAmount * (1 - GAME_CONFIG.ECONOMY.DRAW_PENALTY); // <-- betAmount
        for (const realId of Object.values(realUids)) {
            await payout(realId, refundAmount);
        }
        await db.from("rooms").delete().eq("id", roomId);
        return;
    }

    // --- СЦЕНАРИЙ 4: ИГРОК СБЕЖАЛ / АФК ВО ВРЕМЯ ИГРЫ ---
    if (['surrender', 'timeout', 'banned'].includes(reason) && targetUserId) {
        let losers = lockRoom.players.filter(p => p.id === targetUserId);
        let winners = lockRoom.players.filter(p => p.id !== targetUserId);

        if (lockRoom.publicGameState?.players) { // <-- publicGameState
            const gamePlayers = lockRoom.publicGameState.players;
            const droppingPlayer = gamePlayers.find(p => p.id === targetUserId);

            if (droppingPlayer && droppingPlayer.teamId !== undefined) {
                const losingTeamId = droppingPlayer.teamId;
                losers = lockRoom.players.filter(p => {
                    const gp = gamePlayers.find(g => g.id === p.id);
                    return gp?.teamId === losingTeamId || p.id === targetUserId;
                });
                winners = lockRoom.players.filter(p => !losers.some(l => l.id === p.id));
            }
        }

        const payoutPerWinner = calculateWinPayout(lockRoom.betAmount, lockRoom.requiredPlayers || 2, winners.length);

        for (const winner of winners) if (realUids[winner.id]) await payout(realUids[winner.id], payoutPerWinner);
        for (const loser of losers) if (realUids[loser.id]) await updateActiveRooms({ db, userId: realUids[loser.id], roomId, action: 'remove' });

        if (winners.length > 0) {
            let msg: string = reason === 'timeout' ? ErrorCode.AFK_KICKED : ErrorCode.SURRENDERED;
            if (reason === 'banned') msg = ErrorCode.MODERATOR_KICKED;

            const resetWinners = winners.map(w => ({ ...w, isReady: false }));
            const winnerSecrets: Record<string, string> = {};
            winners.forEach(w => { winnerSecrets[w.id] = realUids[w.id]; });

            await db.from("room_secrets").update({ real_uids: winnerSecrets as any }).eq("room_id", roomId);

            // ➕ ДОБАВЛЯЕМ КУЛДАУН ВСЕМ СБЕЖАВШИМ / АФК
            const joinCooldowns = lockRoom.joinCooldowns || {};
            losers.forEach(loser => {
                const realLoserId = realUids[loser.id];
                if (realLoserId) {
                    joinCooldowns[realLoserId] = Date.now() + GAME_CONFIG.JOIN_COOLDOWN_MS;
                }
            });

            const dbRoomUpdate = toDbRoomUpdate({
                status: 'waiting',
                players: resetWinners,
                publicGameState: null,
                activeDeadline: null,
                complaints: {},
                adminMessage: `${winners[0].id}|${msg}|${Date.now()}`,
                joinCooldowns: joinCooldowns
            });
            await db.from("rooms").update(dbRoomUpdate).eq("id", roomId);

        } else {
            await db.from("rooms").delete().eq("id", roomId);
        }
    }
}

function calculateWinPayout(bet: number, totalPlayers: number, winnersCount: number): number {
    if (winnersCount === 0 || totalPlayers <= winnersCount) return bet;
    const losersCount = totalPlayers - winnersCount;
    const losersPool = losersCount * bet;
    const rewardPool = losersPool * (1 - GAME_CONFIG.ECONOMY.FEE_RATE);
    return bet + (rewardPool / winnersCount);
}