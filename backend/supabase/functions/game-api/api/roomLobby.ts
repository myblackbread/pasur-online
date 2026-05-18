import { PasurGame } from "../game/PasurGame.ts";
import { createShuffledDeck } from "../game/deck.ts";
import { GameError, ErrorCode } from "../errors.ts";
import { GAME_CONFIG } from "../constants.ts";
import { resolveTable } from "./tableManager.ts";

export async function secureJoinRoom(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    const { data: userData } = await adminDb.from("users").select("*").eq("id", uid).single();

    if (!roomData) throw new GameError(ErrorCode.ROOM_NOT_FOUND);
    const secrets = secretDoc?.real_uids || {};

    let publicUid = uid;

    if (Object.values(secrets).includes(uid)) {
        publicUid = Object.keys(secrets).find(key => secrets[key] === uid)!;
        if (roomData.status === 'ready_check' || roomData.status === 'waiting' || roomData.status === 'ready_check_resume') {
            const targetStatus = roomData.status === 'ready_check_resume' ? 'paused' : 'waiting';
            const resetPlayers = roomData.players.map((p: any) => ({ ...p, isReady: false }));
            await adminDb.from("rooms").update({ players: resetPlayers, status: targetStatus }).eq("id", roomId);
        }
        return { success: true, roomId, publicUid };
    }

    if (roomData.status !== 'waiting') throw new GameError(ErrorCode.ROOM_ALREADY_STARTED);
    if (roomData.players.length >= roomData.max_players) throw new GameError(ErrorCode.ROOM_FULL);
    if ((userData?.balance ?? 0) < roomData.bet_amount) throw new GameError(ErrorCode.NOT_ENOUGH_MONEY);

    const shouldHide = !roomData.is_private && userData.settings?.isIncognito;
    publicUid = shouldHide ? `anon_${Math.random().toString(36).substring(2, 12)}` : uid;

    await adminDb.rpc('increment_balance', { user_id: uid, amount: -roomData.bet_amount });
    await adminDb.rpc('add_active_room', { user_id: uid, room_id: roomId });

    secrets[publicUid] = uid;
    await adminDb.from("room_secrets").update({ real_uids: secrets }).eq("room_id", roomId);

    const updatedPlayers = [...roomData.players, { id: publicUid, name: shouldHide ? "__INCOGNITO__" : userData.display_name, isReady: false }];
    await adminDb.from("rooms").update({ players: updatedPlayers }).eq("id", roomId);

    return { success: true, roomId, publicUid };
}

export async function secureToggleReady(data: any, user: any, adminDb: any) {
    const { roomId, isReady } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData) return { success: false };

    if (roomData.status === 'playing' || roomData.status === 'resolving') return { success: true };

    const secrets = secretDoc?.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    const currentPlayer = roomData.players.find((p: any) => p.id === publicUid);

    if (currentPlayer?.isReady) return { success: true };

    if (!isReady) throw new GameError(ErrorCode.INVALID_MOVE);

    const updatedPlayers = roomData.players.map((p: any) => p.id === publicUid ? { ...p, isReady } : p);
    const allReady = updatedPlayers.length === roomData.max_players && updatedPlayers.every((p: any) => p.isReady);

    if (allReady) {
        if (roomData.status === 'ready_check_resume') {
            await adminDb.from("rooms").update({
                players: updatedPlayers,
                status: 'playing',
                turn_deadline: Date.now() + (roomData.turn_duration || GAME_CONFIG.DEFAULT_TURN_DURATION),
                admin_message: `ALL|MSG_GAME_RESUMED|${Date.now()}`
            }).eq("id", roomId);
        } else {
            const game = new PasurGame(updatedPlayers.map((p: any) => p.id), roomData.rule_set, false, undefined, roomData.is_strict, roomData.is_sudden_death);
            
            const currentDeck = game.deck;
            game.deck = [];
            game.deckCount = currentDeck.length;

            await adminDb.from("rooms").update({
                players: updatedPlayers,
                status: 'playing',
                game_state: JSON.parse(JSON.stringify(game)),
                turn_deadline: Date.now() + (roomData.turn_duration || GAME_CONFIG.DEFAULT_TURN_DURATION) + GAME_CONFIG.ANIMATION_DELAYS.DEAL_CARDS,
                admin_message: `ALL|MSG_GAME_STARTED|${Date.now()}`,
                version: (roomData.version || 1) + 1
            }).eq("id", roomId);

            await adminDb.from("room_secrets").update({ deck: currentDeck }).eq("room_id", roomId);
        }
    } else if (roomData.status === 'waiting') {
        await adminDb.from("rooms").update({
            players: updatedPlayers,
            status: 'ready_check',
            ready_deadline: Date.now() + 30000
        }).eq("id", roomId);
    } else if (roomData.status === 'paused') {
        await adminDb.from("rooms").update({ 
            players: updatedPlayers, 
            status: 'ready_check_resume',
            turn_deadline: roomData.ready_deadline,
            ready_deadline: Date.now() + 60000      
        }).eq("id", roomId);
    } else {
        await adminDb.from("rooms").update({ players: updatedPlayers }).eq("id", roomId);
    }
    return { success: true };
}

export async function secureRematch(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData || !secretDoc) throw new GameError(ErrorCode.ROOM_NOT_FOUND);

    if (roomData.status !== 'finished') throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    const secrets = secretDoc.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    const currentPlayer = roomData.players.find((p: any) => p.id === publicUid);
    if (currentPlayer?.isReady) return { success: true }; 

    const { data: userData } = await adminDb.from("users").select("balance").eq("id", uid).single();
    if ((userData?.balance ?? 0) < roomData.bet_amount) throw new GameError(ErrorCode.NOT_ENOUGH_MONEY);

    await adminDb.rpc('increment_balance', { user_id: uid, amount: -roomData.bet_amount });
    await adminDb.rpc('add_active_room', { user_id: uid, room_id: roomId });

    const updatedPlayers = roomData.players.map((p: any) => p.id === publicUid ? { ...p, isReady: true } : p);
    const allReady = updatedPlayers.length === roomData.max_players && updatedPlayers.every((p: any) => p.isReady);

    if (allReady) {
        const game = new PasurGame(updatedPlayers.map((p: any) => p.id), roomData.rule_set, false, undefined, roomData.is_strict, roomData.is_sudden_death);

        const currentDeck = game.deck;
        game.deck = [];
        game.deckCount = currentDeck.length;

        await adminDb.from("rooms").update({
            players: updatedPlayers.map((p: any) => ({ ...p, isReady: false })), 
            status: 'playing',
            game_state: JSON.parse(JSON.stringify(game)),
            turn_deadline: Date.now() + (roomData.turn_duration || GAME_CONFIG.DEFAULT_TURN_DURATION) + GAME_CONFIG.ANIMATION_DELAYS.DEAL_CARDS,
            version: (roomData.version || 1) + 1
        }).eq("id", roomId);

        await adminDb.from("room_secrets").update({ deck: currentDeck }).eq("room_id", roomId);
    } else {
        await adminDb.from("rooms").update({ players: updatedPlayers }).eq("id", roomId);
    }

    return { success: true };
}

export async function secureResolveReadyTimeout(data: any, user: any, adminDb: any) {
    const { roomId } = data;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    if (!roomData || (roomData.status !== 'ready_check' && roomData.status !== 'ready_check_resume')) {
        return { success: false };
    }

    if (Date.now() < (roomData.ready_deadline || 0)) {
        return { success: false };
    }

    const players = roomData.players || [];
    const afkPlayers = players.filter((p: any) => !p.isReady);

    if (afkPlayers.length === 0) return { success: true }; 

    if (roomData.status === 'ready_check_resume') {
        const resetPlayers = roomData.players.map((p: any) => ({ ...p, isReady: false }));
        const restoredDeadline = roomData.turn_deadline || (Date.now() + 3600000);

        await adminDb.from("rooms").update({
            status: 'paused',
            players: resetPlayers,
            ready_deadline: restoredDeadline, 
            turn_deadline: null
        }).eq("id", roomId);
        return { success: true };
    }

    for (const afk of afkPlayers) {
        await resolveTable(adminDb, roomId, 'lobby_leave', afk.id);
    }

    return { success: true };
}

// 🟢 НОВЫЙ ЭНДПОИНТ ДЛЯ ПОИСКА ПО ФИЛЬТРАМ
export async function secureSearchRooms(data: any, user: any, adminDb: any) {
    const { bet, speed, players, ruleSet, isStrict, isSuddenDeath } = data;

    let query = adminDb.from('rooms')
        .select('*')
        .eq('status', 'waiting')
        .eq('is_private', false); // Ищем только публичные столы

    // Применяем переданные фильтры
    if (bet !== undefined) query = query.eq('bet_amount', bet);
    if (speed !== undefined) query = query.eq('turn_duration', speed);
    if (players !== undefined) query = query.eq('max_players', players);
    if (ruleSet) query = query.eq('rule_set', ruleSet);
    if (isStrict !== undefined) query = query.eq('is_strict', isStrict);
    if (isSuddenDeath !== undefined) query = query.eq('is_sudden_death', isSuddenDeath);

    const { data: rooms, error } = await query.order('created_at', { ascending: false }).limit(50);

    if (error) {
        console.error("🔥 Ошибка при поиске комнат:", error);
        throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    return { success: true, rooms: rooms || [] };
}