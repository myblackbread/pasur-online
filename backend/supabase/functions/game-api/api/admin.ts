import { GameError, ErrorCode } from "../errors.ts";

export async function adminDeleteUser(data: any, user: any, adminDb: any) {
    const { data: caller } = await adminDb.from('users').select('is_admin').eq('id', user.id).single();
    if (!caller?.is_admin) throw new GameError(ErrorCode.NOT_ADMIN);

    const { uidToKill } = data;
    if (!uidToKill) throw new GameError(ErrorCode.INVALID_REQUEST);

    const { data: targetUser } = await adminDb.from('users').select('active_rooms').eq('id', uidToKill).single();
    await adminDb.from("users").update({ is_deleted: true }).eq("id", uidToKill);

    if (!targetUser?.active_rooms?.length) return { success: true };

    const { data: rooms } = await adminDb.from("rooms").select("*").in('id', targetUser.active_rooms);
    if (!rooms) return { success: true };

    for (const room of rooms) {
        const { data: secretDoc } = await adminDb.from("room_secrets").select("*").eq("room_id", room.id).single();
        const secrets = secretDoc?.real_uids || {};
        const killedPublicUid = Object.keys(secrets).find(key => secrets[key] === uidToKill);

        if (killedPublicUid && room.players) {
            if (['playing', 'paused', 'ready_check_resume'].includes(room.status)) {
                const innocentPlayer = room.players.find((p: any) => p.id !== killedPublicUid);
                if (innocentPlayer) {
                    const innocentRealId = secrets[innocentPlayer.id];
                    const pot = room.bet_amount * room.max_players;

                    if (innocentRealId) {
                        await adminDb.rpc('increment_balance', { user_id: innocentRealId, amount: pot });
                        await adminDb.rpc('remove_active_room', { user_id: innocentRealId, room_id: room.id });
                    }

                    await adminDb.from("rooms").update({
                        status: 'waiting', players: [{ ...innocentPlayer, isReady: false }], game_state: null, turn_deadline: null,
                        admin_message: `${innocentPlayer.id}|${ErrorCode.MODERATOR_KICKED}|${Date.now()}`
                    }).eq("id", room.id);

                    await adminDb.from("room_secrets").update({ real_uids: { [innocentPlayer.id]: innocentRealId } }).eq("room_id", room.id);
                }
            } else {
                // Логика для комнат в ожидании
                const remainingPlayers = room.players.filter((p: any) => p.id !== killedPublicUid);
                if (remainingPlayers.length === 0) {
                    await adminDb.from("rooms").delete().eq("id", room.id);
                } else {
                    await adminDb.from("rooms").update({ players: remainingPlayers }).eq("id", room.id);
                    delete secrets[killedPublicUid];
                    await adminDb.from("room_secrets").update({ real_uids: secrets }).eq("room_id", room.id);
                }
            }
        }
    }
    return { success: true };
}