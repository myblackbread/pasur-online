import { PasurGame } from "../game/PasurGame.ts";
import { createShuffledDeck } from "../game/deck.ts";

export async function secureProposePause(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData) throw new Error("Room not found");

    const secrets = secretDoc?.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new Error("Вы не за столом");

    if (!roomData.game_state?.isRoundOver) throw new Error("Пауза возможна только между раундами");

    const proposals = roomData.pause_proposals || [];
    if (!proposals.includes(publicUid)) proposals.push(publicUid);

    if (proposals.length === roomData.max_players) {
        await adminDb.from("rooms").update({ status: 'paused', pause_proposals: [], turn_deadline: null }).eq("id", roomId);
    } else {
        await adminDb.from("rooms").update({ pause_proposals: proposals }).eq("id", roomId);
    }
    return { success: true };
}

export async function securePlayCard(data: any, user: any, adminDb: any) {
    const { roomId, cardId, targetCardIds = [] } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData) throw new Error("Room not found");

    const secrets = secretDoc?.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new Error("Вы не за столом");

    const game = new PasurGame(roomData.players.map((p: any) => p.id), roomData.rule_set, true, undefined, roomData.is_strict);
    Object.assign(game, roomData.game_state);
    
    // Возвращаем колоду из секретов для просчета логики
    game.deck = secretDoc.deck || [];

    game.playCard(publicUid, cardId, targetCardIds);

    // Вытаскиваем колоду обратно, валеты остаются в game!
    const currentDeck = game.deck;
    game.deck = []; 
    game.deckCount = currentDeck.length; 

    if (game.isMatchOver && game.matchWinnerTeamId !== null) {
        const pot = roomData.bet_amount * roomData.max_players;
        const winners = game.players.filter((p: any) => p.teamId === game.matchWinnerTeamId);
        const winPerPlayer = pot / winners.length;

        for (const realId of Object.values(secrets) as string[]) {
            await adminDb.rpc('remove_active_room', { user_id: realId, room_id: roomId });
        }

        for (const w of winners) {
            const realId = secrets[w.id];
            if (realId) {
                await adminDb.rpc('increment_balance', { user_id: realId, amount: winPerPlayer });
            }
        }

        await adminDb.from("rooms").update({ status: 'finished', game_state: JSON.parse(JSON.stringify(game)), turn_deadline: null, pause_proposals: [] }).eq("id", roomId);
        await adminDb.from("room_secrets").delete().eq("room_id", roomId);
    } else {
        const nextDeadline = Date.now() + 3600000;
        
        await adminDb.from("room_secrets").update({ deck: currentDeck }).eq("room_id", roomId);

        const { data: updateCheck, error: updateError } = await adminDb.from("rooms")
            .update({ 
                game_state: JSON.parse(JSON.stringify(game)), 
                turn_deadline: nextDeadline,
                version: (roomData.version || 1) + 1 
            })
            .eq("id", roomId)
            .eq("version", roomData.version || 1) 
            .select("id")
            .single();

        if (updateError || !updateCheck) {
            throw new Error("Состояние гонки: кто-то уже сделал ход.");
        }
    }
    return { success: true };
}

export async function secureLeaveRoom(data: any, user: any, adminDb: any) {
    const { roomId, reason } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData) return { success: false };

    const secrets = secretDoc?.real_uids || {};
    const callerPublicUid = Object.keys(secrets).find(k => secrets[k] === uid);
    if (!callerPublicUid) throw new Error("Вы не за столом");

    if (roomData.status === 'ready_check') throw new Error("Идет проверка готовности. Выход заблокирован.");

    if (roomData.status === 'playing' || roomData.status === 'paused' || roomData.status === 'ready_check_resume') {
        let loserPublicId = callerPublicUid;

        if (reason === 'timeout') {
            if (roomData.status !== 'playing') throw new Error("Нельзя забрать по таймауту на паузе.");
            if (Date.now() < (roomData.turn_deadline || 0)) throw new Error("Время еще не вышло!");
            const activePlayerIndex = roomData.game_state.currentTurnIndex;
            loserPublicId = roomData.players[activePlayerIndex].id;
            if (loserPublicId === callerPublicUid) throw new Error("Нельзя выгнать самого себя");
        }

        const game = new PasurGame(roomData.players.map((p: any) => p.id), roomData.rule_set, true, undefined, roomData.is_strict);
        if (roomData.game_state) Object.assign(game, roomData.game_state);

        const losingPlayer = game.players.find((p: any) => p.id === loserPublicId);
        const winningTeamId = losingPlayer?.teamId === 0 ? 1 : 0;
        const winners = game.players.filter((p: any) => p.teamId === winningTeamId);
        const pot = roomData.bet_amount * roomData.max_players;
        const winPerPlayer = pot / winners.length;

        const loserRealId = secrets[loserPublicId];
        if (loserRealId) {
            await adminDb.rpc('remove_active_room', { user_id: loserRealId, room_id: roomId });
        }

        const newRealUids: any = {};
        const newPlayers: any[] = [];

        for (const w of winners) {
            const realId = secrets[w.id];
            if (realId) {
                await adminDb.rpc('increment_balance', { user_id: realId, amount: winPerPlayer });
                await adminDb.rpc('remove_active_room', { user_id: realId, room_id: roomId });
                
                newRealUids[w.id] = realId;
                const pData = roomData.players.find((p: any) => p.id === w.id);
                if (pData) newPlayers.push({ ...pData, isReady: false });
            }
        }

        await adminDb.from("room_secrets").update({ real_uids: newRealUids }).eq("room_id", roomId);
        const msg = reason === 'timeout' ? "Оппонент исключен за бездействие!" : "Оппонент сдался (вышел)!";

        await adminDb.from("rooms").update({
            status: 'waiting', players: newPlayers, game_state: null, turn_deadline: null, pause_proposals: [],
            admin_message: `${winners[0].id}|${msg} Банк ваш!|${Math.random().toString(36).substring(2, 8)}`
        }).eq("id", roomId);

    } else if (roomData.status === 'waiting') {
        await adminDb.rpc('increment_balance', { user_id: uid, amount: roomData.bet_amount });
        await adminDb.rpc('remove_active_room', { user_id: uid, room_id: roomId });

        const remainingPlayers = roomData.players.filter((p: any) => p.id !== callerPublicUid);
        delete secrets[callerPublicUid];

        if (remainingPlayers.length === 0) {
            await adminDb.from("rooms").delete().eq("id", roomId);
            await adminDb.from("room_secrets").delete().eq("room_id", roomId);
        } else {
            await adminDb.from("room_secrets").update({ real_uids: secrets }).eq("room_id", roomId);
            await adminDb.from("rooms").update({ players: remainingPlayers }).eq("id", roomId);
        }
    }
    return { success: true };
}

export async function secureNextRound(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData) return { success: false };

    const secrets = secretDoc?.real_uids || {};
    if (!Object.values(secrets).includes(uid)) throw new Error("Зрители не могут раздавать карты");

    const game = new PasurGame(roomData.players.map((p: any) => p.id), roomData.rule_set, true, undefined, roomData.is_strict);
    Object.assign(game, roomData.game_state);

    if (!game.isRoundOver) throw new Error("Раунд еще не окончен!");

    game.startNewRound(createShuffledDeck(game.roundNumber));

    // Валеты остаются в game, вытаскиваем только колоду
    const currentDeck = game.deck;
    game.deck = [];
    game.deckCount = currentDeck.length;

    await adminDb.from("room_secrets").update({ deck: currentDeck }).eq("room_id", roomId);

    await adminDb.from("rooms").update({ 
        game_state: JSON.parse(JSON.stringify(game)), 
        turn_deadline: Date.now() + 3600000, 
        pause_proposals: [],
        version: (roomData.version || 1) + 1 
    }).eq("id", roomId);
    
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