export async function devAddMoney(user: any, adminDb: any) {
    if (Deno.env.get('ENVIRONMENT') === 'production') throw new Error("Недоступно в продакшене");
    await adminDb.rpc('increment_balance', { user_id: user.id, amount: 500 });
    return { success: true };
}

export async function secureCreateRoom(data: any, user: any, adminDb: any) {
    const { betAmount, ruleSet, isPrivate, maxPlayers = 2 } = data;
    const uid = user.id;

    const { data: userData, error: userErr } = await adminDb.from('users').select('balance, settings, display_name').eq('id', uid).single();

    if (userErr || !userData) throw new Error("Пользователь не найден");
    if (userData.balance < betAmount) throw new Error("Недостаточно средств");

    const shouldHide = !isPrivate && userData.settings?.isIncognito;
    const publicUid = shouldHide ? `anon_${Math.random().toString(36).substring(2, 12)}` : uid;

    const { data: roomData, error: roomErr } = await adminDb.from('rooms').insert({
        bet_amount: betAmount,
        rule_set: ruleSet,
        is_private: !!isPrivate,
        is_strict: !!data.isStrict,
        max_players: maxPlayers,
        status: 'waiting',
        join_code: isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : null,
        players: [{ id: publicUid, name: shouldHide ? "Неизвестный игрок" : userData.display_name, isReady: false }],
        created_at: Date.now()
    }).select('id').single();

    if (roomErr) throw new Error("Ошибка создания комнаты: " + roomErr.message);
    const roomId = roomData.id;

    await adminDb.from('room_secrets').insert({ room_id: roomId, real_uids: { [publicUid]: uid } });

    // Чистый SQL-запрос вместо костылей
    await adminDb.rpc('increment_balance', { user_id: uid, amount: -betAmount });
    await adminDb.rpc('add_active_room', { user_id: uid, room_id: roomId });

    return { success: true, roomId, publicUid };
}