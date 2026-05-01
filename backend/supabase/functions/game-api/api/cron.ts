export async function runGlobalCleanup(adminDb: any) {
    const now = Date.now();

    // 1. Ищем зависшие на старте комнаты (ready_check)
    const { data: readyRooms } = await adminDb.from('rooms')
        .select('*')
        .in('status', ['ready_check', 'ready_check_resume'])
        .lt('ready_deadline', now);

    if (readyRooms && readyRooms.length > 0) {
        for (const room of readyRooms) {
            // Возвращаем деньги всем реальным игрокам
            const { data: secrets } = await adminDb.from('room_secrets').select('real_uids').eq('room_id', room.id).single();
            if (secrets?.real_uids) {
                for (const realId of Object.values(secrets.real_uids) as string[]) {
                    await adminDb.rpc('increment_balance', { user_id: realId, amount: room.bet_amount });
                    await adminDb.rpc('remove_active_room', { user_id: realId, room_id: room.id });
                }
            }
            // Каскадное удаление (secrets удалятся сами)
            await adminDb.from('rooms').delete().eq('id', room.id);
        }
    }

    // 2. Ищем зависшие в игре комнаты (playing / pause_requested)
    const { data: playingRooms } = await adminDb.from('rooms')
        .select('*')
        .in('status', ['playing', 'pause_requested'])
        .lt('turn_deadline', now);

    if (playingRooms && playingRooms.length > 0) {
        for (const room of playingRooms) {
            const { data: secrets } = await adminDb.from('room_secrets').select('real_uids').eq('room_id', room.id).single();
            if (!secrets?.real_uids) {
                await adminDb.from('rooms').delete().eq('id', room.id);
                continue;
            }

            // 🟢 ФИКС: Умный поиск виноватого (AFK)
            let afkPublicId;
            const game = room.game_state;

            if (room.status === 'pause_requested') {
                // Если зависли на паузе, виноват тот, кто НЕ предлагал паузу (кто не ответил)
                const proposals = room.pause_proposals || [];
                afkPublicId = room.players?.find((p: any) => !proposals.includes(p.id))?.id;
            } else {
                // Если просто игра, виноват тот, чей сейчас ход
                afkPublicId = game?.players?.[game?.currentTurnIndex || 0]?.id;
            }
            
            // Если смогли найти виноватого, отдаем банк оппоненту
            if (afkPublicId) {
                const innocentPlayer = room.players?.find((p: any) => p.id !== afkPublicId);
                if (innocentPlayer) {
                    const innocentRealId = secrets.real_uids[innocentPlayer.id];
                    const pot = room.bet_amount * room.max_players;
                    if (innocentRealId) {
                        await adminDb.rpc('increment_balance', { user_id: innocentRealId, amount: pot });
                    }
                }
            }

            // Удаляем зависшую комнату и чистим active_rooms у всех
            for (const realId of Object.values(secrets.real_uids) as string[]) {
                await adminDb.rpc('remove_active_room', { user_id: realId, room_id: room.id });
            }
            await adminDb.from('rooms').delete().eq('id', room.id);
        }
    }

    return { success: true, message: `Очищено: ${readyRooms?.length || 0} (ready), ${playingRooms?.length || 0} (playing)` };
}