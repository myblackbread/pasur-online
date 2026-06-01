import { supabase, mapUserFromDB } from "@/shared/api";
import { UserProfile } from "../model/user.types";

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
                    is_admin: false,
                    is_deleted: false,
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
                        if (existingData && isSubscribed) callback(mapUserFromDB(existingData));
                        return;
                    }
                    console.error("🔥 Ошибка при создании профиля:", insertErr.message);
                    if (isSubscribed) callback(null);
                    return;
                }

                if (isSubscribed) callback(mapUserFromDB(newProfile));
                return;
            }

            if (isSubscribed) {
                if (data) callback(mapUserFromDB(data));
                else callback(null);
            }
        };

        fetchAndEnsureUser();

        const channelName = `user_changes_${uid}_${Math.random().toString(36).substring(7)}`;
        const channel = supabase.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${uid}` }, (payload) => {
                if (!isSubscribed) return;
                callback(mapUserFromDB(payload.new));
            })
            .subscribe();

        return () => {
            isSubscribed = false;
            supabase.removeChannel(channel);
        };
    }
}