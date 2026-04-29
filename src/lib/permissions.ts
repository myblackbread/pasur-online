import { User } from '@supabase/supabase-js';

export type Feature = 
    | 'CREATE_PRIVATE_ROOM' 
    | 'ADD_FRIEND' 
    | 'HIGH_STAKES_TABLE'
    | 'UPLOAD_CUSTOM_AVATAR';

const GUEST_RESTRICTIONS: Record<Feature, string> = {
    CREATE_PRIVATE_ROOM: 'Гости не могут создавать приватные столы. Привяжите аккаунт!',
    ADD_FRIEND: 'Добавление в друзья доступно только зарегистрированным игрокам.',
    HIGH_STAKES_TABLE: 'Гости могут играть только на ставках до 1000 монет.',
    UPLOAD_CUSTOM_AVATAR: 'Загрузка аватарок недоступна для гостей.'
};

export const AccessManager = {
    isGuest(user: User | null): boolean {
        // 🟢 В Supabase анонимность проверяется свойством is_anonymous
        return user?.is_anonymous ?? true; 
    },

    canAccess(user: User | null, feature: Feature): { allowed: boolean; reason?: string } {
        if (!user) return { allowed: false, reason: 'Пожалуйста, войдите в систему.' };
        if (this.isGuest(user)) return { allowed: false, reason: GUEST_RESTRICTIONS[feature] };
        return { allowed: true };
    }
};