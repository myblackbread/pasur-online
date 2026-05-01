import { ErrorCode } from "../errors.ts";

export async function runGlobalCleanup(adminDb: any) {
    const now = Date.now();

    // 1. Очистка зависших проверок готовности
    const { data: readyRooms } = await adminDb.from('rooms')
        .select('*').in('status', ['ready_check', 'ready_check_resume']).lt('ready_deadline', now);

    if (readyRooms) {
        for (const room of readyRooms) {
            const { data: secrets } = await adminDb.from('room_secrets').select('real_uids').eq('room_id', room.id).single();
            if (secrets?.real_uids) {
                for (const realId of Object.values(secrets.real_uids) as string[]) {
                    await adminDb.rpc('increment_balance', { user_id: realId, amount: room.bet_amount });
                    await adminDb.rpc('remove_active_room', { user_id: realId, room_id: room.id });
                }
            }
            await adminDb.from('rooms').delete().eq('id', room.id);
        }
    }

    // 2. Очистка зависших игр (AFK)
    const { data: playingRooms } = await adminDb.from('rooms')
        .select('*').in('status', ['playing', 'pause_requested']).lt('turn_deadline', now);

    if (playingRooms) {
        for (const room of playingRooms) {
            const { data: secrets } = await adminDb.from('room_secrets').select('real_uids').eq('room_id', room.id).single();
            if (!secrets?.real_uids) {
                await adminDb.from('rooms').delete().eq('id', room.id);
                continue;
            }

            let afkPublicId;
            if (room.status === 'pause_requested') {
                afkPublicId = room.players?.find((p: any) => !(room.pause_proposals || []).includes(p.id))?.id;
            } else {
                afkPublicId = room.game_state?.players?.[room.game_state?.currentTurnIndex || 0]?.id;
            }
            
            if (afkPublicId) {
                const innocentPlayer = room.players?.find((p: any) => p.id !== afkPublicId);
                if (innocentPlayer) {
                    const innocentRealId = secrets.real_uids[innocentPlayer.id];
                    if (innocentRealId) {
                        await adminDb.rpc('increment_balance', { user_id: innocentRealId, amount: room.bet_amount * room.max_players });
                        // Важно: уведомляем через код
                        await adminDb.from("rooms").update({
                             admin_message: `${innocentPlayer.id}|${ErrorCode.AFK_KICKED}|${Date.now()}`
                        }).eq("id", room.id);
                    }
                }
            }

            for (const realId of Object.values(secrets.real_uids) as string[]) {
                await adminDb.rpc('remove_active_room', { user_id: realId, room_id: room.id });
            }
            await adminDb.from('rooms').delete().eq('id', room.id);
        }
    }
    return { success: true };
}