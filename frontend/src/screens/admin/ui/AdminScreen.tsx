"use client";

import React from 'react';
import { supabase } from '@/shared/api';
import { UserProfile, userApi } from '@/entities/user';
import { useAlert } from '@/app/providers/AlertProvider';
import { useTranslation } from 'react-i18next';

export default function AdminScreen() {
    const [users, setUsers] = React.useState<UserProfile[]>([]);
    const { showAlert } = useAlert();
    const { t } = useTranslation();

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('*').eq('is_deleted', false);
        if (data) {
            // Маппим snake_case в camelCase
            const mappedUsers = data.map((u: any) => ({
                uid: u.id,
                displayName: u.display_name,
                balance: u.balance,
                isDeleted: u.is_deleted
            })) as UserProfile[];
            setUsers(mappedUsers);
        }
    };

    React.useEffect(() => {
        fetchUsers();

        // Подписываемся на изменения в таблице пользователей
        const channel = supabase.channel('admin_users_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchUsers();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleDeleteUser = (userToKill: UserProfile) => {
        showAlert({
            title: `${t('admin_confirm_delete')} ${userToKill.displayName}?`,
            buttons: [
                {
                    text: "Удалить",
                    style: "destructive",
                    onPress: (user) => async () => {
                        try {
                            await userApi.adminDeleteUser(userToKill.uid);

                            showAlert({
                                title: `${userToKill.displayName} ${t('admin_user_deleted')}`,
                                buttons: [{ text: "OK", style: "cancel" }]
                            });
                        } catch (error: any) {
                            showAlert({
                                title: `${t('admin_delete_error')} ${error.message}`,
                                buttons: [{ text: "OK", style: "cancel" }]
                            });
                        }
                    }
                },
                {
                    text: "Отмена",
                    style: "cancel",
                }
            ]
        })
    };

    return (
        <div className="flex-1 min-h-0 bg-theme-main text-white p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-red-500">🛡️ {t('admin_title')}</h1>
                <div className="bg-theme-panel rounded-xl overflow-hidden border border-theme-border">
                    <table className="w-full text-left">
                        <thead className="bg-theme-main border-b border-theme-border">
                            <tr>
                                <th className="p-4">{t('admin_uid')}</th>
                                <th className="p-4">{t('admin_name')}</th>
                                <th className="p-4">{t('admin_balance')}</th>
                                <th className="p-4">{t('admin_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.uid} className="border-b border-theme-border/50 hover:bg-slate-700/30">
                                    <td className="p-4 font-mono text-xs text-slate-400">{user.uid}</td>
                                    <td className="p-4 font-bold">{user.displayName}</td>
                                    <td className="p-4 text-amber-400">{user.balance} 💰</td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1 rounded transition-colors text-sm font-bold"
                                        >
                                            {t('admin_btn_kick')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}