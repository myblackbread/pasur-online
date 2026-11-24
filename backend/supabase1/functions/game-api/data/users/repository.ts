import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/core/database/database.types.ts";
import { GameError, ErrorCode, User } from "@/shared/index.ts";
import { UserMapper, AvatarMapper } from "./mapper.ts";

export async function getUser({ db, userId }: { db: SupabaseClient<Database>, userId: string }): Promise<User> {
    const { data, error } = await db.from("users")
        .select("*, wallets(balance)")
        .eq("id", userId)
        .single();

    if (error || !data) throw new GameError(ErrorCode.USER_NOT_FOUND);

    const walletData = data.wallets as unknown as { balance: number } | null;
    const balance = walletData?.balance || 0;

    return UserMapper.toDomain(data, balance);
}

export async function getUser({ 
    db, 
    userId, 
    requireActive = true // По умолчанию требуем "живого" юзера
}: { 
    db: SupabaseClient<Database>, 
    userId: string,
    requireActive?: boolean 
}): Promise<User> {
    const { data, error } = await db.from("users")
        .select("*, wallets(balance)")
        .eq("id", userId)
        .single();

    if (error || !data) throw new GameError(ErrorCode.USER_NOT_FOUND);

    const walletData = data.wallets as unknown as { balance: number } | null;
    const balance = walletData?.balance || 0;

    // В маппер нужно будет добавить парсинг onboarding_deadline
    const user = UserMapper.toDomain(data, balance); 

    // 💥 ГЛОБАЛЬНАЯ ЗАЩИТА:
    if (requireActive && user.onboardingDeadline !== null) {
        throw new GameError(ErrorCode.PROFILE_INCOMPLETE);
    }

    return user;
}

export async function banUser({ db, userId }: { db: SupabaseClient<Database>, userId: string }): Promise<void> {
    await db.from("users")
        .update(UserMapper.toDbUpdate({ isDeleted: true }))
        .eq("id", userId);
}

export async function processBilling({ db, targetId, amount }: { db: SupabaseClient<Database>, targetId: string, amount: number }): Promise<void> {
    const { error } = await db.rpc('process_billing', { target_player_id: targetId, amount });
    
    if (error) {
        console.error(`[Billing] Failed for ${targetId}:`, error.message);
        if (error.message.includes('ERR_NOT_ENOUGH_MONEY')) throw new GameError(ErrorCode.NOT_ENOUGH_MONEY);
        throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    }
}

export async function ensureAvatarExists({ db, userId, avatarId }: { db: SupabaseClient<Database>, userId: string, avatarId: string }): Promise<void> {
    const { error } = await db.from('avatars').insert(
        AvatarMapper.toDbInsert({ id: avatarId, userId })
    );

    if (error && error.code !== '23505') { 
        throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    }
}

export async function getRealUserId({ db, playerId }: { db: SupabaseClient<Database>, playerId: string }): Promise<string> {
    const { data: user } = await db.from('users').select('id').eq('id', playerId).maybeSingle();
    if (user) return user.id;

    const { data: avatar } = await db.from('avatars').select('user_id').eq('id', playerId).single();
    if (!avatar) throw new GameError(ErrorCode.USER_NOT_FOUND);
    
    return avatar.user_id;
}

export async function updateActiveRooms({ db, userId, roomId, action }: { db: SupabaseClient<Database>, userId: string, roomId: string, action: 'add' | 'remove' }): Promise<void> {
    const rpcName = action === 'add' ? 'add_active_room' : 'remove_active_room';
    await db.rpc(rpcName, { user_id: userId, room_id: roomId });
}