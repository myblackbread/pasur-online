import { PasurGame } from "../game/PasurGame.ts";
import { createShuffledDeck } from "../game/deck.ts";
import { GameError, ErrorCode } from "../errors.ts";
import { GAME_CONFIG } from "../constants.ts";
import { resolveTable, calculateWinPayout } from "./tableManager.ts";

async function saveActiveGameState(adminDb: any, roomId: string, roomData: any, game: PasurGame, extraTime: number = 0) {
    const currentDeck = game.deck;
    game.deck = [];
    game.deckCount = currentDeck.length;

    await adminDb.from("room_secrets").update({ deck: currentDeck }).eq("room_id", roomId);

    const { data: updateCheck, error: updateError } = await adminDb.from("rooms")
        .update({
            game_state: JSON.parse(JSON.stringify(game)),
            // 🟢 Добавляем extraTime к стандартному времени хода
            turn_deadline: Date.now() + (roomData.turn_duration || GAME_CONFIG.DEFAULT_TURN_DURATION) + extraTime,
            pause_proposals: [],
            version: (roomData.version || 1) + 1
        })
        .eq("id", roomId)
        .eq("version", roomData.version || 1)
        .select("id")
        .single();

    if (updateError || !updateCheck) throw new GameError(ErrorCode.NOT_YOUR_TURN);
}

export async function secureProposePause(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData || !secretDoc) throw new GameError(ErrorCode.ROOM_NOT_FOUND);

    const secrets = secretDoc.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    if (roomData.status === 'paused' || roomData.status === 'pause_requested') {
        throw new GameError(ErrorCode.PAUSE_ALREADY_ACTIVE);
    }

    if (!roomData.game_state || !roomData.game_state.isRoundOver) {
        throw new GameError(ErrorCode.WRONG_ROUND_STATE);
    }

    const deadline = Date.now() + 30000;
    await adminDb.from("rooms").update({
        status: 'pause_requested',
        pause_proposals: [publicUid],
        turn_deadline: deadline
    }).eq("id", roomId);

    return { success: true };
}

export async function secureAnswerPauseRequest(data: any, user: any, adminDb: any) {
    const { roomId, accept } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData || !secretDoc) throw new GameError(ErrorCode.ROOM_NOT_FOUND);

    const secrets = secretDoc.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    if (roomData.status !== 'pause_requested') throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    if (roomData.pause_proposals.includes(publicUid)) {
        throw new GameError(ErrorCode.INVALID_MOVE);
    }

    if (accept) {
        const resetPlayers = roomData.players.map((p: any) => ({ ...p, isReady: false }));

        await adminDb.from("rooms").update({
            status: 'paused',
            players: resetPlayers,
            pause_proposals: [],
            turn_deadline: null,
            ready_deadline: Date.now() + 86400000
        }).eq("id", roomId);
    } else {
        await adminDb.from("rooms").update({
            status: 'playing',
            pause_proposals: [],
            turn_deadline: Date.now() + (roomData.turn_duration || GAME_CONFIG.DEFAULT_TURN_DURATION)
        }).eq("id", roomId);
    }
    
    return { success: true };
}

export async function secureResolvePauseTimeout(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();

    if (!roomData || roomData.status !== 'pause_requested') return { success: false };

    if (Date.now() >= (roomData.turn_deadline || 0)) {
        await adminDb.from("rooms").update({
            status: 'playing', pause_proposals: [], turn_deadline: Date.now() + (roomData.turn_duration || GAME_CONFIG.DEFAULT_TURN_DURATION)
        }).eq("id", roomId);
        return { success: true };
    }
    return { success: false };
}

export async function securePlayCard(data: any, user: any, adminDb: any) {
    const { roomId, cardId, targetCardIds = [] } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData) throw new GameError(ErrorCode.ROOM_NOT_FOUND);

    const secrets = secretDoc?.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    if (roomData.status !== 'playing') throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    const game = new PasurGame(roomData.players.map((p: any) => p.id), roomData.rule_set, true, undefined, roomData.is_strict, roomData.is_sudden_death);
    Object.assign(game, roomData.game_state);

    game.deck = secretDoc.deck || [];
    game.playCard(publicUid, cardId, targetCardIds);

    // 🟢 Расчет компенсации времени на анимации для следующего хода
    let extraTime = GAME_CONFIG.ANIMATION_DELAYS.PLAY_CARD;
    if (game.lastAction && game.lastAction.capturedCards.length > 0) {
        extraTime += GAME_CONFIG.ANIMATION_DELAYS.CAPTURE;
    }
    // Если после этого хода были выданы новые карты, у всех игроков на руках снова по 4 карты
    if (game.players.every((p: any) => p.hand.length === 4)) {
        extraTime += GAME_CONFIG.ANIMATION_DELAYS.DEAL_CARDS;
    }

    if (game.isMatchOver && game.matchWinnerTeamId !== null) {
        game.deckCount = game.deck.length;
        game.deck = [];

        const winners = game.players.filter((p: any) => p.teamId === game.matchWinnerTeamId);
        const winPerPlayer = calculateWinPayout(roomData.bet_amount, roomData.max_players, winners.length);

        for (const realId of Object.values(secrets) as string[]) {
            await adminDb.rpc('remove_active_room', { user_id: realId, room_id: roomId });
        }

        for (const w of winners) {
            const realId = secrets[w.id];
            if (realId) await adminDb.rpc('increment_balance', { user_id: realId, amount: winPerPlayer });
        }

        const resetPlayers = roomData.players.map((p: any) => ({ ...p, isReady: false }));
        await adminDb.from("rooms").update({
            status: 'finished', players: resetPlayers, game_state: JSON.parse(JSON.stringify(game)), turn_deadline: null, pause_proposals: []
        }).eq("id", roomId);
    } else {
        await saveActiveGameState(adminDb, roomId, roomData, game, extraTime);
    }
    return { success: true };
}

export async function secureLeaveRoom(data: any, user: any, adminDb: any) {
    const { roomId, reason } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData || !secretDoc) return { success: false };

    const secrets = secretDoc.real_uids || {};
    const callerPublicUid = Object.keys(secrets).find(k => secrets[k] === uid);
    if (!callerPublicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    if (roomData.status === 'ready_check') throw new GameError(ErrorCode.INVALID_MOVE);

    let targetPublicId = callerPublicUid;

    if (reason === 'timeout') {
        if (roomData.status !== 'playing') throw new GameError(ErrorCode.INVALID_MOVE);
        if (Date.now() < (roomData.turn_deadline || 0)) throw new GameError(ErrorCode.INVALID_MOVE);

        const activePlayerIndex = roomData.game_state?.currentTurnIndex || 0;
        targetPublicId = roomData.players[activePlayerIndex]?.id;

        if (targetPublicId === callerPublicUid) throw new GameError(ErrorCode.INVALID_MOVE);
    }

    const leaveReason = reason === 'timeout' ? 'timeout' : (['playing', 'paused', 'ready_check_resume'].includes(roomData.status) ? 'surrender' : 'lobby_leave');
    await resolveTable(adminDb, roomId, leaveReason, targetPublicId);

    return { success: true };
}

export async function secureNextRound(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData) return { success: false };

    if (roomData.status !== 'playing') throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    const secrets = secretDoc?.real_uids || {};
    if (!Object.values(secrets).includes(uid)) throw new GameError(ErrorCode.UNAUTHORIZED);

    const game = new PasurGame(roomData.players.map((p: any) => p.id), roomData.rule_set, true, undefined, roomData.is_strict, roomData.is_sudden_death);
    Object.assign(game, roomData.game_state);

    if (!game.isRoundOver) throw new GameError(ErrorCode.WRONG_ROUND_STATE);
    if (game.isMatchOver) throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    game.startNewRound(createShuffledDeck(game.roundNumber));

    // 🟢 Компенсация за время анимации раздачи новых карт
    await saveActiveGameState(adminDb, roomId, roomData, game, GAME_CONFIG.ANIMATION_DELAYS.DEAL_CARDS);

    return { success: true };
}

export async function secureGetMyMask(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!secretDoc) return { mask: null };
    const secrets = secretDoc.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === user.id);
    return { mask: publicUid || null };
}

export async function secureSendReaction(data: any, user: any, adminDb: any) {
    return { success: true };
}