import { PasurGame } from "../game/PasurGame.ts";

export const ECONOMY = {
    FEE_RATE: 0.10, 
    DRAW_PENALTY: 0.30 
};

export type LeaveReason = 'surrender' | 'timeout' | 'banned' | 'lobby_leave' | 'admin_delete' | 'cron_delete' | 'cron_pause_timeout';

export function calculateWinPayout(bet: number, totalPlayers: number, winnersCount: number): number {
    if (winnersCount === 0 || totalPlayers <= winnersCount) return bet; 
    const losersCount = totalPlayers - winnersCount;
    const losersPool = losersCount * bet; 
    const rewardPool = losersPool * (1 - ECONOMY.FEE_RATE); 
    return bet + (rewardPool / winnersCount); 
}

export async function resolveTable(adminDb: any, roomId: string, reason: LeaveReason, targetPublicId: string | null = null) {
    const { data: room, error: lockErr } = await adminDb.from("rooms")
        .update({ status: 'resolving' })
        .eq("id", roomId)
        .neq("status", "resolving") 
        .select("*")
        .single();
        
    if (lockErr || !room) return { success: false, message: "Room locked or already resolved" };

    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!secretDoc) return { success: false };

    const secrets = secretDoc.real_uids || {};
    const originalStatus = room.status; 

    if (reason === 'admin_delete') {
        for (const player of room.players) {
            const realId = secrets[player.id];
            if (realId) {
                if (originalStatus !== 'finished' || player.isReady) {
                    await adminDb.rpc('increment_balance', { user_id: realId, amount: room.bet_amount });
                }
                await adminDb.rpc('remove_active_room', { user_id: realId, room_id: room.id });
            }
        }
        await adminDb.from("rooms").delete().eq("id", roomId);
        return { success: true };
    }

    if (originalStatus === 'waiting' || originalStatus === 'ready_check' || originalStatus === 'finished') {
        if (!targetPublicId) return { success: false };
        const targetRealId = secrets[targetPublicId];
        const targetPlayer = room.players.find((p: any) => p.id === targetPublicId);
        
        if (targetRealId) {
            if (originalStatus !== 'finished' || targetPlayer?.isReady) {
                await adminDb.rpc('increment_balance', { user_id: targetRealId, amount: room.bet_amount });
            }
            await adminDb.rpc('remove_active_room', { user_id: targetRealId, room_id: room.id });
        }

        const remainingPlayers = room.players.filter((p: any) => p.id !== targetPublicId);
        delete secrets[targetPublicId];

        if (remainingPlayers.length === 0) {
            await adminDb.from("rooms").delete().eq("id", roomId);
        } else {
            const resetPlayers = remainingPlayers.map((p:any) => ({ ...p, isReady: false }));
            if (originalStatus === 'finished' && remainingPlayers[0].isReady) {
                const remRealId = secrets[remainingPlayers[0].id];
                if (remRealId) await adminDb.rpc('increment_balance', { user_id: remRealId, amount: room.bet_amount });
            }

            await adminDb.from("room_secrets").update({ real_uids: secrets }).eq("room_id", roomId);
            await adminDb.from("rooms").update({ 
                status: 'waiting', players: resetPlayers, ready_deadline: null, game_state: null 
            }).eq("id", roomId);
        }
        return { success: true };
    }

    if (reason === 'cron_pause_timeout') {
        let t0Score = 0; let t1Score = 0;
        
        if (room.game_state) {
            // 🟢 ИСПРАВЛЕНО: Передаем параметры strict и sudden_death в конструктор для корректного подсчета
            const game = new PasurGame([], room.rule_set, true, undefined, room.is_strict, room.is_sudden_death);
            Object.assign(game, room.game_state);
            const liveScores = game.getLiveScores();
            t0Score = liveScores[0];
            t1Score = liveScores[1];
        }

        if (t0Score === t1Score) {
            const refundAmount = room.bet_amount * (1 - ECONOMY.DRAW_PENALTY);
            for (const player of room.players) {
                const realId = secrets[player.id];
                if (realId) {
                    await adminDb.rpc('increment_balance', { user_id: realId, amount: refundAmount });
                    await adminDb.rpc('remove_active_room', { user_id: realId, room_id: room.id });
                }
            }
        } else {
            const winningTeamId = t0Score > t1Score ? 0 : 1;
            const winners = room.players.filter((p: any) => {
                const gp = room.game_state?.players?.find((g: any) => g.id === p.id);
                return gp?.teamId === winningTeamId;
            });
            const losers = room.players.filter((p: any) => !winners.some(w => w.id === p.id));
            
            const payout = calculateWinPayout(room.bet_amount, room.max_players, winners.length);
            for (const w of winners) {
                if (secrets[w.id]) {
                    await adminDb.rpc('increment_balance', { user_id: secrets[w.id], amount: payout });
                    await adminDb.rpc('remove_active_room', { user_id: secrets[w.id], room_id: room.id });
                }
            }
            for (const l of losers) {
                if (secrets[l.id]) await adminDb.rpc('remove_active_room', { user_id: secrets[l.id], room_id: room.id });
            }
        }

        await adminDb.from("rooms").delete().eq("id", roomId);
        return { success: true };
    }

    if (['playing', 'paused', 'pause_requested', 'ready_check_resume', 'resolving'].includes(originalStatus)) {
        if (!targetPublicId) return { success: false };
        
        const players = room.players;
        let losers: any[] = [];
        let winners: any[] = [];

        if (room.game_state?.players && room.game_state.players.length > 0) {
            const gamePlayers = room.game_state.players;
            const droppingPlayer = gamePlayers.find((p: any) => p.id === targetPublicId);
            
            if (droppingPlayer && droppingPlayer.teamId !== undefined) {
                const losingTeamId = droppingPlayer.teamId;
                losers = players.filter((p: any) => {
                    const gp = gamePlayers.find((g: any) => g.id === p.id);
                    return gp?.teamId === losingTeamId || p.id === targetPublicId;
                });
                winners = players.filter((p: any) => !losers.some(l => l.id === p.id));
            } else {
                losers = players.filter((p: any) => p.id === targetPublicId);
                winners = players.filter((p: any) => p.id !== targetPublicId);
            }
        } else {
            losers = players.filter((p: any) => p.id === targetPublicId);
            winners = players.filter((p: any) => p.id !== targetPublicId);
        }

        if (winners.length > 0) {
            const payoutPerWinner = calculateWinPayout(room.bet_amount, room.max_players, winners.length);

            for (const winner of winners) {
                const winnerRealId = secrets[winner.id];
                if (winnerRealId) {
                    await adminDb.rpc('increment_balance', { user_id: winnerRealId, amount: payoutPerWinner });
                    await adminDb.rpc('remove_active_room', { user_id: winnerRealId, room_id: room.id });
                }
            }
        }

        for (const loser of losers) {
            const loserRealId = secrets[loser.id];
            if (loserRealId) await adminDb.rpc('remove_active_room', { user_id: loserRealId, room_id: room.id });
        }

        if (winners.length > 0) {
            let msg = reason === 'timeout' ? "MSG_AFK_KICKED" : "MSG_SURRENDERED";
            if (reason === 'banned') msg = "MSG_BANNED";

            const resetWinners = winners.map((w: any) => ({ ...w, isReady: false }));
            const winnerSecrets: any = {};
            winners.forEach((w: any) => { winnerSecrets[w.id] = secrets[w.id]; });

            await adminDb.from("rooms").update({
                status: 'waiting', players: resetWinners, game_state: null, 
                turn_deadline: null, ready_deadline: null, pause_proposals: [],
                admin_message: `${winners[0].id}|${msg}|${Date.now()}`
            }).eq("id", roomId);
            
            await adminDb.from("room_secrets").update({ real_uids: winnerSecrets }).eq("room_id", roomId);
        } else {
            await adminDb.from("rooms").delete().eq("id", roomId);
        }
        return { success: true };
    }

    return { success: false };
}