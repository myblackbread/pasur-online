import { callApi, supabase } from '@/shared/api';

export const userApi = {
    async updateUserEmoji(uid: string, emoji: string) {
        const { data } = await supabase.from('users').select('settings').eq('id', uid).single();
        if (data) {
            const newSettings = { ...data.settings, avatarEmoji: emoji };
            await supabase.from('users').update({ settings: newSettings }).eq('id', uid);
        }
    },

    async addMoney(): Promise<void> {
        await callApi('devAddMoney', {});
    },

    async adminDeleteUser(uidToKill: string): Promise<void> {
        await callApi('adminDeleteUser', { uidToKill });
    },
};