import { GameError, ErrorCode } from "../utils/errors.ts";
import { User } from "../types/models.types.ts";
import { toDomainUser } from "../utils/mappers.ts";
import { GetUserParams, BanUserParams, IncrementBalanceParams, UpdateActiveRoomsParams } from "../types/api.types.ts";

export async function getUser({ db, userId }: GetUserParams): Promise<User> {
    const { data, error } = await db.from("users").select("*").eq("id", userId).single();

    if (error || !data) throw new GameError(ErrorCode.USER_NOT_FOUND);

    return toDomainUser(data);
}

export async function banUser({ db, userId }: BanUserParams): Promise<void> {
    await db.from("users").update({ is_deleted: true }).eq("id", userId);
}

export async function incrementBalance({ db, userId, amount }: IncrementBalanceParams): Promise<void> {
    const { error } = await db.rpc('increment_balance', { user_id: userId, amount });

    if (error) {
        console.error(`[UserRepo] Failed to increment balance for user ${userId}:`, error.message);
        throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    }
}

export async function updateActiveRooms({ db, userId, roomId, action }: UpdateActiveRoomsParams): Promise<void> {
    const rpcName = action === 'add' ? 'add_active_room' : 'remove_active_room';

    await db.rpc(rpcName, { user_id: userId, room_id: roomId });
}