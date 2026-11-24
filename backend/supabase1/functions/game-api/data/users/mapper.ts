import { Database } from "@/core/database/database.types.ts";
import { User, UserSettings } from "@/shared/index.ts";

type UserDbRow = Database['public']['Tables']['users']['Row'];
type UserDbUpdate = Database['public']['Tables']['users']['Update'];
type AvatarDbInsert = Database['public']['Tables']['avatars']['Insert'];

export const UserMapper = {
    toDomain(dbRow: UserDbRow, balance: number): User {
        return {
            id: dbRow.id,
            balance: balance,
            isAdmin: dbRow.is_admin,
            isDeleted: dbRow.is_deleted,
            activeRooms: dbRow.active_rooms,
            settings: dbRow.settings as unknown as UserSettings, 
        };
    },

    toDbUpdate(domainUser: Partial<User>): UserDbUpdate {
        const result: any = {};
        if (domainUser.isDeleted !== undefined) result.is_deleted = domainUser.isDeleted;
        if (domainUser.isAdmin !== undefined) result.is_admin = domainUser.isAdmin;
        if (domainUser.activeRooms !== undefined) result.active_rooms = domainUser.activeRooms;
        if (domainUser.settings !== undefined) result.settings = domainUser.settings as unknown as string;
        return result as UserDbUpdate;
    }
};

export const AvatarMapper = {
    toDbInsert(data: { id: string; userId: string; walletId?: string }): AvatarDbInsert {
        const result: any = {
            id: data.id,
            user_id: data.userId
        };
        if (data.walletId !== undefined) result.wallet_id = data.walletId;
        return result as AvatarDbInsert;
    }
};