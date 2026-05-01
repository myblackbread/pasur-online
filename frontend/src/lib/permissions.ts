import { User } from '@supabase/supabase-js';

export type Feature = 
    | 'CREATE_PRIVATE_ROOM' 
    | 'ADD_FRIEND' 
    | 'HIGH_STAKES_TABLE'
    | 'UPLOAD_CUSTOM_AVATAR';

const GUEST_RESTRICTIONS: Record<Feature, string> = {
    CREATE_PRIVATE_ROOM: 'err_guest_private_room',
    ADD_FRIEND: 'err_guest_friend',
    HIGH_STAKES_TABLE: 'err_guest_high_stakes',
    UPLOAD_CUSTOM_AVATAR: 'err_guest_avatar'
};

export const AccessManager = {
    isGuest(user: User | null): boolean {
        return user?.is_anonymous ?? true; 
    },

    canAccess(user: User | null, feature: Feature): { allowed: boolean; reason?: string } {
        if (!user) return { allowed: false, reason: 'err_auth_required' }; // Тоже заменили на ключ
        if (this.isGuest(user)) return { allowed: false, reason: GUEST_RESTRICTIONS[feature] };
        return { allowed: true };
    }
};