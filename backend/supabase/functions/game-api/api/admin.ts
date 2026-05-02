import { GameError, ErrorCode } from "../errors.ts";
import { resolveTable } from "./tableManager.ts";

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

        if (killedPublicUid) {
            await resolveTable(adminDb, room.id, 'banned', killedPublicUid);
        }
    }
    return { success: true };
}