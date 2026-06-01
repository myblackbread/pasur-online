"use client";

import React from 'react';
import { supabase, mapUserFromDB } from '@/shared/api'; // <-- Импортируем наш маппер
import { UserDTO } from '@/shared/api/contracts/dto'; // <-- Используем новый DTO
import { userApi } from '@/entities/user';
import { useAlert } from '@/app/providers/AlertProvider';
import { useTranslation } from 'react-i18next';

export default function AdminScreen() {
    // 1. Меняем стейт на UserDTO
    const [users, setUsers] = React.useState<UserDTO[]>([]);
    const { showAlert } = useAlert();
    const { t } = useTranslation();

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('*').eq('is_deleted', false);
        if (data) {
            // 2. Изящно пропускаем сырые данные через наш централизованный маппер
            const mappedUsers = data.map(mapUserFromDB);
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

    // 3. Здесь тоже принимаем UserDTO
    const handleDeleteUser = (userToKill: UserDTO) => {
        showAlert({
            title: `${t('admin_confirm_delete')} ${userToKill.displayName}?`,
            buttons: [
                {
                    text: "Удалить",
                    style: "destructive",
                    // Обрати внимание: убрал неиспользуемый аргумент (user) из onPress
                    onPress: () => async () => {
                        try {
                            // 4. Используем .id вместо .uid
                            await userApi.adminDeleteUser(userToKill.id);

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
                                <tr key={user.id} className="border-b border-theme-border/50 hover:bg-slate-700/30">
                                    <td className="p-4 font-mono text-xs text-slate-400">{user.id}</td>
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