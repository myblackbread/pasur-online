import { PasurGame } from "../game/PasurGame.ts";
import { createShuffledDeck } from "../game/deck.ts";

// 🟢 НОВЫЙ ХЕЛПЕР: Сохраняет стейт игры, пряча колоду в секреты
async function saveActiveGameState(adminDb: any, roomId: string, roomData: any, game: PasurGame) {
    const currentDeck = game.deck;
    game.deck = [];
    game.deckCount = currentDeck.length;

    await adminDb.from("room_secrets").update({ deck: currentDeck }).eq("room_id", roomId);

    const { data: updateCheck, error: updateError } = await adminDb.from("rooms")
        .update({ 
            game_state: JSON.parse(JSON.stringify(game)), 
            turn_deadline: Date.now() + 3600000,
            pause_proposals: [],
            version: (roomData.version || 1) + 1 
        })
        .eq("id", roomId)
        .eq("version", roomData.version || 1) 
        .select("id")
        .single();

    if (updateError || !updateCheck) throw new Error("Состояние гонки: кто-то уже сделал ход.");
}

export async function secureProposePause(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData || !secretDoc) throw new Error("Room not found");

    const secrets = secretDoc.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new Error("Вы не за столом");

    if (roomData.status === 'paused' || roomData.status === 'pause_requested') {
        throw new Error("Пауза уже запрошена или активна");
    }

    if (!roomData.game_state || !roomData.game_state.isRoundOver) {
        throw new Error("Паузу можно предложить только между раздачами!");
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
    if (!roomData || !secretDoc) throw new Error("Room not found");

    const secrets = secretDoc.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new Error("Вы не за столом");

    if (roomData.status !== 'pause_requested') throw new Error("Нет активного запроса на паузу");

    if (roomData.pause_proposals.includes(publicUid)) {
        throw new Error("Вы ожидаете ответа соперника");
    }

    if (accept) {
        await adminDb.from("rooms").update({ status: 'paused', pause_proposals: [], turn_deadline: null }).eq("id", roomId);
    } else {
        await adminDb.from("rooms").update({ status: 'playing', pause_proposals: [], turn_deadline: Date.now() + 3600000 }).eq("id", roomId);
    }

    return { success: true };
}

export async function secureResolvePauseTimeout(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    
    if (!roomData || roomData.status !== 'pause_requested') return { success: false };

    if (Date.now() >= (roomData.turn_deadline || 0)) {
        await adminDb.from("rooms").update({
            status: 'playing', pause_proposals: [], turn_deadline: Date.now() + 3600000
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
    if (!roomData) throw new Error("Room not found");

    const secrets = secretDoc?.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new Error("Вы не за столом");

    const game = new PasurGame(roomData.players.map((p: any) => p.id), roomData.rule_set, true, undefined, roomData.is_strict);
    Object.assign(game, roomData.game_state);
    
    game.deck = secretDoc.deck || [];
    game.playCard(publicUid, cardId, targetCardIds);

    // 🟢 ФИКС: Используем хелпер, если матч продолжается
    if (game.isMatchOver && game.matchWinnerTeamId !== null) {
        game.deckCount = game.deck.length; 
        game.deck = []; 

        const pot = roomData.bet_amount * roomData.max_players;
        const winners = game.players.filter((p: any) => p.teamId === game.matchWinnerTeamId);
        const winPerPlayer = pot / winners.length;

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
        await saveActiveGameState(adminDb, roomId, roomData, game);
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

    if (roomData.status === 'playing' || roomData.status === 'paused' || roomData.status === 'ready_check_resume' || roomData.status === 'pause_requested') {
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
        if (loserRealId) await adminDb.rpc('remove_active_room', { user_id: loserRealId, room_id: roomId });

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

    } else if (roomData.status === 'waiting' || roomData.status === 'finished') {
        const callerPlayer = roomData.players.find((p: any) => p.id === callerPublicUid);
        
        if (roomData.status === 'waiting' || (roomData.status === 'finished' && callerPlayer?.isReady)) {
            await adminDb.rpc('increment_balance', { user_id: uid, amount: roomData.bet_amount });
            await adminDb.rpc('remove_active_room', { user_id: uid, room_id: roomId });
        } else if (roomData.status === 'finished') {
            await adminDb.rpc('remove_active_room', { user_id: uid, room_id: roomId });
        }

        const remainingPlayers = roomData.players.filter((p: any) => p.id !== callerPublicUid);
        delete secrets[callerPublicUid];

        if (remainingPlayers.length === 0) {
            await adminDb.from("rooms").delete().eq("id", roomId);
            await adminDb.from("room_secrets").delete().eq("room_id", roomId);
        } else {
            const remainingPlayer = remainingPlayers[0];
            if (roomData.status === 'finished' && remainingPlayer.isReady) {
                const remainingRealId = secrets[remainingPlayer.id];
                if (remainingRealId) {
                    await adminDb.rpc('increment_balance', { user_id: remainingRealId, amount: roomData.bet_amount });
                    await adminDb.rpc('remove_active_room', { user_id: remainingRealId, room_id: roomId });
                }
                remainingPlayer.isReady = false;
            }

            await adminDb.from("room_secrets").update({ real_uids: secrets }).eq("room_id", roomId);
            await adminDb.from("rooms").update({ players: remainingPlayers, status: 'waiting', game_state: null }).eq("id", roomId);
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

    if (roomData.status !== 'playing') throw new Error("Неверный статус комнаты для раздачи карт");

    const secrets = secretDoc?.real_uids || {};
    if (!Object.values(secrets).includes(uid)) throw new Error("Зрители не могут раздавать карты");

    const game = new PasurGame(roomData.players.map((p: any) => p.id), roomData.rule_set, true, undefined, roomData.is_strict);
    Object.assign(game, roomData.game_state);

    if (!game.isRoundOver) throw new Error("Раунд еще не окончен!");
    if (game.isMatchOver) throw new Error("Матч уже завершен!");

    game.startNewRound(createShuffledDeck(game.roundNumber));
    
    // 🟢 ФИКС: Используем хелпер
    await saveActiveGameState(adminDb, roomId, roomData, game);
    
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