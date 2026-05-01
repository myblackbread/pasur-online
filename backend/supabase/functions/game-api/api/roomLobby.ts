import { PasurGame } from "../game/PasurGame.ts";
import { createShuffledDeck } from "../game/deck.ts";

export async function secureJoinRoom(data: any, user: any, adminDb: any) {
    const { roomId } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    const { data: userData } = await adminDb.from("users").select("*").eq("id", uid).single();

    if (!roomData) throw new Error("Стол не найден");
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

    if (roomData.status !== 'waiting') throw new Error("Игра уже идет");
    if (roomData.players.length >= roomData.max_players) throw new Error("Стол заполнен");
    if ((userData?.balance ?? 0) < roomData.bet_amount) throw new Error("Недостаточно средств");

    const shouldHide = !roomData.is_private && userData.settings?.isIncognito;
    publicUid = shouldHide ? `anon_${Math.random().toString(36).substring(2, 12)}` : uid;

    // Безопасное списание баланса через SQL-процедуры
    await adminDb.rpc('increment_balance', { user_id: uid, amount: -roomData.bet_amount });
    await adminDb.rpc('add_active_room', { user_id: uid, room_id: roomId });

    secrets[publicUid] = uid;
    await adminDb.from("room_secrets").update({ real_uids: secrets }).eq("room_id", roomId);

    const updatedPlayers = [...roomData.players, { id: publicUid, name: shouldHide ? "Неизвестный" : userData.display_name, isReady: false }];
    await adminDb.from("rooms").update({ players: updatedPlayers }).eq("id", roomId);

    return { success: true, roomId, publicUid };
}

export async function secureToggleReady(data: any, user: any, adminDb: any) {
const { roomId, isReady } = data;
    const uid = user.id;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    if (!roomData) return { success: false };

    if (roomData.status === 'playing') return { success: true };

    const secrets = secretDoc?.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new Error("Вы не за столом");

    const currentPlayer = roomData.players.find((p: any) => p.id === publicUid);

    // 🟢 ЖЕСТКАЯ ЗАЩИТА БЭКЕНДА:
    // Если игрок уже нажал готовность, любые дальнейшие запросы просто игнорируются
    if (currentPlayer?.isReady) {
        return { success: true }; 
    }

    // Если хакер прислал isReady: false в обход фронтенда
    if (!isReady) {
        throw new Error("Отмена готовности запрещена сервером!");
    }

    const updatedPlayers = roomData.players.map((p: any) => p.id === publicUid ? { ...p, isReady } : p);
    const allReady = updatedPlayers.length === roomData.max_players && updatedPlayers.every((p: any) => p.isReady);

    if (allReady) {
        let currentDeck: any[] = [];
        let game: any;

        if (roomData.status === 'ready_check_resume') {
            game = new PasurGame(updatedPlayers.map((p: any) => p.id), roomData.rule_set, true, undefined, roomData.is_strict);
            Object.assign(game, roomData.game_state);
            game.startNewRound(createShuffledDeck(game.roundNumber));
        } else {
            game = new PasurGame(updatedPlayers.map((p: any) => p.id), roomData.rule_set, false, undefined, roomData.is_strict);
        }

        currentDeck = game.deck;
        game.deck = [];
        game.deckCount = currentDeck.length;

        await adminDb.from("rooms").update({
            players: updatedPlayers,
            status: 'playing',
            game_state: JSON.parse(JSON.stringify(game)),
            turn_deadline: Date.now() + 3600000,
            admin_message: `ALL|Игра ${roomData.status === 'ready_check_resume' ? 'возобновлена' : 'началась'}!|${Date.now()}`,
            version: (roomData.version || 1) + 1
        }).eq("id", roomId);

        await adminDb.from("room_secrets").update({ deck: currentDeck }).eq("room_id", roomId);

    } else if (roomData.status === 'waiting') {
        await adminDb.from("rooms").update({
            players: updatedPlayers,
            status: 'ready_check',
            ready_deadline: Date.now() + 30000
        }).eq("id", roomId);
    } else if (roomData.status === 'paused') {
        await adminDb.from("rooms").update({ players: updatedPlayers, status: 'ready_check_resume' }).eq("id", roomId);
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
    if (!roomData || !secretDoc) throw new Error("Room not found");

    if (roomData.status !== 'finished') throw new Error("Игра еще не завершена");

    const secrets = secretDoc.real_uids || {};
    const publicUid = Object.keys(secrets).find(key => secrets[key] === uid);
    if (!publicUid) throw new Error("Вы не за столом");

    const currentPlayer = roomData.players.find((p: any) => p.id === publicUid);
    if (currentPlayer?.isReady) return { success: true }; // Уже оплатил реванш

    const { data: userData } = await adminDb.from("users").select("balance").eq("id", uid).single();
    if ((userData?.balance ?? 0) < roomData.bet_amount) throw new Error("Недостаточно средств для реванша");

    // Списываем ставку и возвращаем статус "в активной игре"
    await adminDb.rpc('increment_balance', { user_id: uid, amount: -roomData.bet_amount });
    await adminDb.rpc('add_active_room', { user_id: uid, room_id: roomId });

    const updatedPlayers = roomData.players.map((p: any) => p.id === publicUid ? { ...p, isReady: true } : p);
    const allReady = updatedPlayers.length === roomData.max_players && updatedPlayers.every((p: any) => p.isReady);

    if (allReady) {
        // Оба готовы -> запускаем игру!
        const game = new PasurGame(updatedPlayers.map((p: any) => p.id), roomData.rule_set, false, undefined, roomData.is_strict);

        const currentDeck = game.deck;
        game.deck = [];
        game.deckCount = currentDeck.length;

        await adminDb.from("rooms").update({
            players: updatedPlayers.map((p: any) => ({ ...p, isReady: false })), // Сброс флага для конца следующего матча
            status: 'playing',
            game_state: JSON.parse(JSON.stringify(game)),
            turn_deadline: Date.now() + 3600000,
            version: (roomData.version || 1) + 1
        }).eq("id", roomId);

        await adminDb.from("room_secrets").update({ deck: currentDeck }).eq("room_id", roomId);
    } else {
        // Один нажал реванш, ждем второго. Стол остается в finished, чтобы UI не ломался.
        await adminDb.from("rooms").update({ players: updatedPlayers }).eq("id", roomId);
    }

    return { success: true };
}

export async function secureResolveReadyTimeout(data: any, user: any, adminDb: any) {
    const { roomId } = data;

    const { data: roomData } = await adminDb.from("rooms").select("*").eq("id", roomId).single();
    const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", roomId).single();
    
    if (!roomData || (roomData.status !== 'ready_check' && roomData.status !== 'ready_check_resume')) {
        return { success: false };
    }

    // Проверяем, действительно ли вышло время
    if (Date.now() < (roomData.ready_deadline || 0)) {
        return { success: false };
    }

    const secrets = secretDoc?.real_uids || {};
    const players = roomData.players || [];
    
    const afkPlayers = players.filter((p: any) => !p.isReady);
    if (afkPlayers.length === 0) return { success: true }; // Если все успели, игра сама начнется

    // Возвращаем деньги ВСЕМ, но АФК-игроков выкидываем из комнаты
    const remainingPlayers: any[] = [];
    const newSecrets: any = {};

    for (const p of players) {
        const realId = secrets[p.id];
        if (!realId) continue;

        // Возвращаем замороженную ставку на баланс
        await adminDb.rpc('increment_balance', { user_id: realId, amount: roomData.bet_amount });

        if (p.isReady) {
            // Молодец, нажал кнопку. Оставляем в комнате, сбрасываем готовность для нового поиска
            remainingPlayers.push({ ...p, isReady: false });
            newSecrets[p.id] = realId;
        } else {
            // АФК. Выкидываем из активных комнат
            await adminDb.rpc('remove_active_room', { user_id: realId, room_id: roomId });
        }
    }

    if (remainingPlayers.length === 0) {
        // Если оба были АФК (например, на реванше) - удаляем комнату полностью
        await adminDb.from("rooms").delete().eq("id", roomId);
        await adminDb.from("room_secrets").delete().eq("room_id", roomId);
    } else {
        // Кто-то остался - откатываем комнату в режим ожидания
        await adminDb.from("rooms").update({
            status: 'waiting',
            players: remainingPlayers,
            ready_deadline: null,
            admin_message: `ALL|Оппонент не подтвердил готовность и был исключен.|${Date.now()}`
        }).eq("id", roomId);
        await adminDb.from("room_secrets").update({ real_uids: newSecrets }).eq("room_id", roomId);
    }

    return { success: true };
}