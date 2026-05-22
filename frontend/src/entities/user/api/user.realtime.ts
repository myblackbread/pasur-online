import { supabase } from "@/shared/api";
import { UserProfile } from "../model/user.types";

const mapUser = (data: any): UserProfile => ({
    uid: data.id,
    displayName: data.display_name,
    balance: data.balance,
    avatarEmoji: data.settings?.avatarEmoji || '😎',
    gender: data.settings?.gender || 'male',
    activeRooms: data.active_rooms || [],
    settings: data.settings || { isIncognito: false, blockedUids: [] },
    createdAt: data.created_at || Date.now(),
    lastActive: data.last_active || Date.now()
});

export const userRealtimeApi = {
    subscribeToUser(uid: string, callback: (user: UserProfile | null) => void) {
        let isSubscribed = true;

        const fetchAndEnsureUser = async () => {
            const { data, error } = await supabase.from('users').select('*').eq('id', uid).single();

            if (error && error.code === 'PGRST116') {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                const newProfile = {
                    id: uid,
                    display_name: authUser?.user_metadata?.name || `Player_${uid.substring(0, 5)}`,
                    balance: 1000,
                    active_rooms: [],
                    settings: {
                        isIncognito: false,
                        blockedUids: [],
                        avatarEmoji: authUser?.is_anonymous ? '👻' : '😎',
                        gender: 'male'
                    }
                };

                const { error: insertErr } = await supabase.from('users').insert(newProfile);

                if (insertErr) {
                    if (insertErr.code === '23505') {
                        const { data: existingData } = await supabase.from('users').select('*').eq('id', uid).single();
                        if (existingData && isSubscribed) callback(mapUser(existingData));
                        return;
                    }
                    console.error("🔥 Ошибка при создании профиля:", insertErr.message);
                    if (isSubscribed) callback(null);
                    return;
                }

                if (isSubscribed) callback(mapUser(newProfile));
                return;
            }

            if (isSubscribed) {
                if (data) callback(mapUser(data));
                else callback(null);
            }
        };

        fetchAndEnsureUser();

        const channelName = `user_changes_${uid}_${Math.random().toString(36).substring(7)}`;
        const channel = supabase.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${uid}` }, (payload) => {
                if (!isSubscribed) return;
                callback(mapUser(payload.new));
            })
            .subscribe();

        return () => {
            isSubscribed = false;
            supabase.removeChannel(channel);
        };
    }
}