import { supabase } from './client';

export const authApi = {
    async login(provider: 'google' | 'email' | 'guest', email?: string, password?: string, gender?: 'male' | 'female'): Promise<string> {
        let authResult;

        if (provider === 'google') {
            authResult = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (authResult.error) throw authResult.error;
            return "";
        } else if (provider === 'guest') {
            authResult = await supabase.auth.signInAnonymously();
        } else if (provider === 'email' && email && password) {
            authResult = await supabase.auth.signInWithPassword({ email, password });
            if (authResult.error?.message.includes("Invalid login")) {
                authResult = await supabase.auth.signUp({ email, password });
            }
        } else {
            throw new Error("err_invalid_login_data");
        }

        if (authResult?.error) throw authResult.error;
        const user = authResult.data?.user;
        if (!user) throw new Error("err_auth_failed");

        const { data: userDoc } = await supabase.from('users').select('*').eq('id', user.id).single();

        if (!userDoc) {
            let displayName = user.user_metadata?.name || (email ? email.split('@')[0] : `Guest_${user.id.substring(0, 5)}`);
            await supabase.from('users').insert({
                id: user.id,
                display_name: displayName,
                balance: 1000,
                active_rooms: [],
                settings: {
                    isIncognito: gender === 'female',
                    blockedUids: [],
                    avatarEmoji: provider === 'guest' ? '👻' : '😎',
                    gender
                }
            });
        }
        return user.id;
    },

    async linkGoogleAccount(): Promise<void> {
        const { error } = await supabase.auth.linkIdentity({ provider: 'google' });
        if (error) throw new Error("err_google_already_linked");
    }
};