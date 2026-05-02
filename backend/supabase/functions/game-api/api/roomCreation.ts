import { GameError, ErrorCode } from "../errors.ts";
import { GAME_CONFIG } from "../constants.ts";

export async function devAddMoney(user: any, adminDb: any) {
    if (Deno.env.get('ENVIRONMENT') === 'production') throw new GameError(ErrorCode.UNAUTHORIZED);
    await adminDb.rpc('increment_balance', { user_id: user.id, amount: 500 });
    return { success: true };
}

export async function secureCreateRoom(data: any, user: any, adminDb: any) {
    // 🟢 ИСПРАВЛЕНО: Достаем isSuddenDeath из data
    const { betAmount, ruleSet, isPrivate, maxPlayers = 2, isStrict = true, isSuddenDeath = false, turnDuration = GAME_CONFIG.DEFAULT_TURN_DURATION } = data;

    if (!GAME_CONFIG.ALLOWED_BETS.includes(betAmount)) throw new GameError(ErrorCode.INVALID_REQUEST, "Invalid bet amount");
    if (!GAME_CONFIG.ALLOWED_SPEEDS.includes(turnDuration)) throw new GameError(ErrorCode.INVALID_REQUEST, "Invalid turn duration");
    if (!GAME_CONFIG.ALLOWED_PLAYERS.includes(maxPlayers)) throw new GameError(ErrorCode.INVALID_REQUEST, "Invalid players count"); 
    const uid = user.id;

    const { data: userData, error: userErr } = await adminDb.from('users').select('balance, settings, display_name').eq('id', uid).single();

    if (userErr || !userData) throw new GameError(ErrorCode.USER_NOT_FOUND);
    if (userData.balance < betAmount) throw new GameError(ErrorCode.NOT_ENOUGH_MONEY);

    const shouldHide = !isPrivate && userData.settings?.isIncognito;
    const publicUid = shouldHide ? `anon_${Math.random().toString(36).substring(2, 12)}` : uid;

    const { data: roomData, error: roomErr } = await adminDb.from('rooms').insert({
        bet_amount: betAmount,
        rule_set: ruleSet,
        is_private: !!isPrivate,
        is_strict: !!isStrict,
        is_sudden_death: !!isSuddenDeath, // 🟢 ИСПРАВЛЕНО: Сохраняем в БД
        max_players: maxPlayers,
        turn_duration: turnDuration,
        status: 'waiting',
        join_code: isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : null,
        players: [{ id: publicUid, name: shouldHide ? "Неизвестный игрок" : userData.display_name, isReady: false }],
        created_at: Date.now()
    }).select('id').single();

    if (roomErr) {
        console.error("🔥 Ошибка БД при создании комнаты:", roomErr);
        throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    }
    const roomId = roomData.id;

    await adminDb.from('room_secrets').insert({ room_id: roomId, real_uids: { [publicUid]: uid } });

    await adminDb.rpc('increment_balance', { user_id: uid, amount: -betAmount });
    await adminDb.rpc('add_active_room', { user_id: uid, room_id: roomId });

    return { success: true, roomId, publicUid };
}