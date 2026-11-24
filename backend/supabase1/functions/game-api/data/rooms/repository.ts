import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/core/database/database.types.ts";
import { GameError, ErrorCode } from "@/shared/errors.ts";
import { GAME_CONFIG } from "@/shared/constants.ts";
import { Room, RoomPlayer, RoomStatus } from "@/shared/index.ts";
import { RoomSecrets, FullGameState } from "@/core/engine/models.ts";
import { PasurGame } from "@/core/engine/PasurGame.ts";
import { LeaveReason } from "@/core/types.ts";

import { getUser, processBilling, updateActiveRooms } from "@/data/users/repository.ts";
import { createReviewTicket } from "@/data/reviews/repository.ts";
import { RoomMapper, RoomPlayerMapper, RoomSecretMapper, RpcMapper } from "./mapper.ts";

export async function getRoomWithSecrets({ db, roomId }: { db: SupabaseClient<Database>, roomId: string }): Promise<{ room: Room; secrets: RoomSecrets }> {
    const { data: roomData, error: roomErr } = await db.from("rooms").select("*").eq("id", roomId).single();
    const { data: playersData } = await db.from("room_players").select("*").eq("room_id", roomId).order('joined_at', { ascending: true });
    const { data: secData } = await db.from("room_secrets").select("*").eq("room_id", roomId).maybeSingle();

    if (roomErr || !roomData) throw new GameError(ErrorCode.ROOM_NOT_FOUND);

    const room = RoomMapper.toDomain(roomData);
    room.players = (playersData || []).map(RoomPlayerMapper.toDomain);

    return {
        room,
        secrets: secData ? RoomSecretMapper.toDomain(secData) : { roomId, fullGameState: null }
    };
}

export async function getRoomsByStatus({ db, status }: { db: SupabaseClient<Database>, status: RoomStatus }): Promise<Room[]> {
    const { data, error } = await db.from("rooms").select("*").eq("status", status);
    if (error || !data) return [];
    return data.map(RoomMapper.toDomain);
}

export async function searchPublicRooms({ db, filters }: { db: SupabaseClient<Database>, filters: Partial<Room> }): Promise<Room[]> {
    let query = db.from('rooms').select('*').eq('status', 'waiting').is('join_code', null);

    if (filters.betAmount !== undefined) query = query.eq('bet_amount', filters.betAmount);
    if (filters.turnDuration !== undefined) query = query.eq('turn_duration', filters.turnDuration);
    if (filters.requiredPlayers !== undefined) query = query.eq('required_players', filters.requiredPlayers);
    if (filters.ruleSet) query = query.eq('rule_set', filters.ruleSet);
    if (filters.isStrict !== undefined) query = query.eq('is_strict', filters.isStrict);
    if (filters.isSuddenDeath !== undefined) query = query.eq('is_sudden_death', filters.isSuddenDeath);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);

    return data.map(RoomMapper.toDomain);
}

export async function getRoomPlayers({ db, roomId }: { db: SupabaseClient<Database>, roomId: string }): Promise<RoomPlayer[]> {
    const { data, error } = await db.from("room_players").select("*").eq("room_id", roomId);
    if (error) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    return data.map(RoomPlayerMapper.toDomain);
}

export async function createRoom({ db, roomId, roomData }: { db: SupabaseClient<Database>, roomId: string, roomData: Partial<Room> }): Promise<void> {
    const dbInsertData = RoomMapper.toDbInsert({ ...roomData, id: roomId, createdAt: new Date().toISOString() });

    const { error: roomErr } = await db.from('rooms').insert(dbInsertData);
    if (roomErr) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);

    await db.from('room_secrets').insert(RoomSecretMapper.toDbInsert(roomId));
}

export async function addPlayerToRoom({ db, roomId, userId, avatarId }: { db: SupabaseClient<Database>, roomId: string, userId: string | null, avatarId: string | null }): Promise<void> {
    const { error } = await db.from("room_players").insert(
        RoomPlayerMapper.toDbInsert({ roomId, userId, avatarId, isReady: false })
    );
    if (error) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
}

export async function setPlayerReady({ db, roomId, playerId, isReady }: { db: SupabaseClient<Database>, roomId: string, playerId: string, isReady: boolean }) {
    await db.from("room_players")
        .update(RoomPlayerMapper.toDbUpdate({ isReady }))
        .eq("room_id", roomId)
        .or(`user_id.eq.${playerId},avatar_id.eq.${playerId}`);
}

export async function resetAllPlayersReady({ db, roomId }: { db: SupabaseClient<Database>, roomId: string }): Promise<void> {
    await db.from("room_players")
        .update(RoomPlayerMapper.toDbUpdate({ isReady: false }))
        .eq("room_id", roomId);
}

export async function updateRoomDeadline({ db, roomId, currentVersion, newDeadline }: { db: SupabaseClient<Database>, roomId: string, currentVersion: number, newDeadline: number | null }): Promise<void> {
    const dbUpdate = RoomMapper.toDbUpdate({ activeDeadline: newDeadline, version: currentVersion + 1 });

    const { error } = await db.from("rooms")
        .update(dbUpdate)
        .eq("id", roomId)
        .eq("version", currentVersion)
        .select("id")
        .single();

    if (error) throw new GameError(ErrorCode.STATE_OUTDATED);
}

export async function updateRoomState({ 
    db, roomId, status, activeDeadline, secretState, currentVersion 
}: { 
    db: SupabaseClient<Database>, roomId: string, status: RoomStatus, activeDeadline?: number | null, secretState?: FullGameState | null, currentVersion: number 
}) {
    const dbUpdateData = RoomMapper.toDbUpdate({
        status: status,
        activeDeadline: activeDeadline,
        version: currentVersion + 1
    });

    const { error } = await db.from("rooms")
        .update(dbUpdateData)
        .eq("id", roomId)
        .eq("version", currentVersion)
        .select("id")
        .single();

    if (error) throw new GameError(ErrorCode.STATE_OUTDATED);

    if (secretState) {
        await db.from("room_secrets").update(RoomSecretMapper.toDbUpdate(secretState)).eq("room_id", roomId);
    }
}

export async function saveGameTurn({ 
    db, roomId, status, secretState, newDeadline, currentVersion 
}: { 
    db: SupabaseClient<Database>, roomId: string, status: RoomStatus, secretState: FullGameState, newDeadline: number | null, currentVersion: number 
}) {
    const dbRoomUpdate = RoomMapper.toDbUpdate({
        status: status,
        activeDeadline: newDeadline,
        version: currentVersion + 1
    });

    const { data, error } = await db.from("rooms")
        .update(dbRoomUpdate)
        .eq("id", roomId)
        .eq("version", currentVersion)
        .select("id").single();

    if (error || !data) throw new GameError(ErrorCode.STATE_OUTDATED);
    await db.from("room_secrets").update(RoomSecretMapper.toDbUpdate(secretState)).eq("room_id", roomId);
}

export async function deleteRoomAndCreateTicket({ 
    db, room, secrets 
}: { 
    db: SupabaseClient<Database>, room: Room, secrets: RoomSecrets 
}) {
    const { data: complaints } = await db.from("room_complaints").select("*").eq("room_id", room.id).limit(1);

    if (complaints && complaints.length > 0) {
        const c = complaints[0];
        await createReviewTicket({
            db,
            reporterId: c.reporter_uid,
            suspectId: c.suspect_uid,
            matchSnapshot: secrets.fullGameState
        });
    }

    await resolveTable({ db, roomId: room.id, reason: 'cron_pause_timeout' });
}

export async function resolveTable({ 
    db, roomId, reason, targetUserId, finalGame 
}: { 
    db: SupabaseClient<Database>, roomId: string, reason: LeaveReason, targetUserId?: string | null, finalGame?: PasurGame 
}) {
    const { data: lockData, error: lockErr } = await db.from("rooms")
        .update(RoomMapper.toDbUpdate({ status: 'finished' }))
        .eq("id", roomId)
        .neq("status", 'finished')
        .select("*").single();

    if (lockErr || !lockData) return;

    const lockRoom = RoomMapper.toDomain(lockData);
    const { room: populatedRoom } = await getRoomWithSecrets({ db, roomId });

    const payouts: { userId: string, amount: number }[] = [];
    const usersToRemove: string[] = [];
    const playersToKick: string[] = [];

    let newStatus: string | null = null;
    let newDeadline: number | null = null;
    let adminMsg: string | null = null;
    let shouldDeleteRoom = false;

    const queuePayout = (player: RoomPlayer, amount: number) => {
        if (player.userId && amount > 0) payouts.push({ userId: player.userId, amount });
        if (player.userId) usersToRemove.push(player.userId);
    };

    if (reason === 'match_finished' && finalGame) {
        const winners = populatedRoom.players.filter(p => {
            const playerId = p.avatarId || p.userId;
            const gp = finalGame.state.players.find(g => g.playerId === playerId);
            return gp?.teamId === finalGame.state.matchWinnerTeamId;
        });

        const winAmount = calculateWinPayout({
            bet: lockRoom.betAmount,
            totalPlayers: lockRoom.requiredPlayers || 2,
            winnersCount: winners.length
        });

        for (const w of winners) queuePayout(w, winAmount);

        newStatus = 'finished';
        newDeadline = Date.now() + finalGame.getAnimationDuration() + GAME_CONFIG.ANIMATION.DURATION.RESULT_SCREEN;

    } else if (reason === 'cron_pause_timeout' || reason === 'cron_delete') {
        const refundAmount = lockRoom.betAmount * (1 - GAME_CONFIG.ECONOMY.DRAW_PENALTY);
        for (const player of populatedRoom.players) queuePayout(player, refundAmount);
        shouldDeleteRoom = true;

    } else if (['surrender', 'timeout', 'banned'].includes(reason) && targetUserId) {
        const losers = populatedRoom.players.filter(p => p.avatarId === targetUserId || p.userId === targetUserId);
        const winners = populatedRoom.players.filter(p => p.avatarId !== targetUserId && p.userId !== targetUserId);

        const payoutPerWinner = calculateWinPayout({
            bet: lockRoom.betAmount,
            totalPlayers: lockRoom.requiredPlayers || 2,
            winnersCount: winners.length
        });

        for (const winner of winners) queuePayout(winner, payoutPerWinner);
        for (const loser of losers) {
            if (loser.userId) usersToRemove.push(loser.userId);
            playersToKick.push((loser.avatarId || loser.userId) as string);
        }

        if (winners.length > 0) {
            let msg: string = reason === 'timeout' ? ErrorCode.AFK_KICKED : ErrorCode.SURRENDERED;
            if (reason === 'banned') msg = ErrorCode.MODERATOR_KICKED;

            const winnerId = winners[0].avatarId || winners[0].userId;

            await resetAllPlayersReady({ db, roomId });

            newStatus = 'waiting';
            newDeadline = null;
            adminMsg = `${winnerId}|${msg}|${Date.now()}`;
        } else {
            shouldDeleteRoom = true;
        }
    }

    const { error } = await db.rpc(
        'resolve_game_table',
        RpcMapper.toResolveTableArgs({
            roomId: roomId,
            payouts: payouts,
            usersToRemove: usersToRemove,
            playersToKick: playersToKick,
            newStatus: newStatus,
            newDeadline: newDeadline,
            adminMessage: adminMsg,
            deleteRoom: shouldDeleteRoom
        })
    );

    if (error) console.error(`[CRITICAL] Failed to resolve table transaction for room ${roomId}:`, error);
}

export async function kickAfkLobbyPlayers({ db, room, afkPlayerIds }: { db: SupabaseClient<Database>, room: Room, afkPlayerIds: string[] }) {
    const payouts: { userId: string, amount: number }[] = [];
    const usersToRemove: string[] = [];
    const playersToKick: string[] = [];

    for (const targetId of afkPlayerIds) {
        const player = room.players.find(p => p.avatarId === targetId || p.userId === targetId);
        if (player && player.userId) {
            payouts.push({ userId: player.userId, amount: room.betAmount });
            usersToRemove.push(player.userId);
        }
        playersToKick.push(targetId);
    }

    const remainingCount = room.players.length - afkPlayerIds.length;
    const shouldDeleteRoom = remainingCount <= 0;

    const { error } = await db.rpc('resolve_game_table', RpcMapper.toResolveTableArgs({
        roomId: room.id,
        payouts: payouts,
        usersToRemove: usersToRemove,
        playersToKick: playersToKick,
        newStatus: null,
        newDeadline: null,    
        adminMessage: null,
        deleteRoom: shouldDeleteRoom
    }));

    if (error) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
}

export async function resetRoomForRematch({ db, roomId }: { db: SupabaseClient<Database>, roomId: string }): Promise<void> {
    const { data: lockId, error: lockErr } = await db.from("rooms")
        .update(RoomMapper.toDbUpdate({ activeDeadline: null }))
        .eq("id", roomId)
        .eq("status", 'finished')
        .not("active_deadline", "is", null)
        .select("id").single();

    if (lockErr || !lockId) return;

    const { room } = await getRoomWithSecrets({ db, roomId });
    const remainingPlayers: RoomPlayer[] = [];

    for (const player of room.players) {
        const userId = player.userId;
        if (!userId) continue;

        const user = await getUser({ db, userId });

        if ((user?.balance || 0) >= room.betAmount) {
            await processBilling({ db, targetId: userId, amount: -room.betAmount });
            remainingPlayers.push({ ...player, isReady: false });
        } else {
            await updateActiveRooms({ db, userId, roomId, action: 'remove' });
            await db.from("room_players").delete().eq("room_id", roomId).eq("user_id", userId);
        }
    }

    if (remainingPlayers.length === 0) {
        await db.from("rooms").delete().eq("id", roomId);
        return;
    }

    await resetAllPlayersReady({ db, roomId });

    await db.from("rooms").update(RoomMapper.toDbUpdate({
        status: 'waiting',
        activeDeadline: null
    })).eq("id", roomId);
}

function calculateWinPayout({ bet, totalPlayers, winnersCount }: { bet: number, totalPlayers: number, winnersCount: number }): number {
    if (winnersCount === 0 || totalPlayers <= winnersCount) return bet;
    const losersCount = totalPlayers - winnersCount;
    const losersPool = losersCount * bet;
    const rewardPool = losersPool * (1 - GAME_CONFIG.ECONOMY.FEE_RATE);
    return bet + (rewardPool / winnersCount);
}