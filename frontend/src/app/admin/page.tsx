"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { useAlert } from '@/components/AlertProvider';
import { fbManager } from '@/lib/supabaseManager';

export default function AdminPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const { showAlert, showConfirm } = useAlert();

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

    useEffect(() => {
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
        showConfirm(`Точно удалить пользователя ${userToKill.displayName}?`, async () => {
            try {
                await fbManager.adminDeleteUser(userToKill.uid);

                showAlert(`Пользователь ${userToKill.displayName} успешно удален сервером.`);
            } catch (error: any) {
                showAlert("Ошибка удаления: " + error.message);
            }
        });
    };

    return (
        <div className="min-h-screen bg-theme-main text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-red-500">🛡️ Панель управления (Admin)</h1>
                <div className="bg-theme-panel rounded-xl overflow-hidden border border-theme-border">
                    <table className="w-full text-left">
                        <thead className="bg-theme-main border-b border-theme-border">
                            <tr>
                                <th className="p-4">UID</th>
                                <th className="p-4">Имя</th>
                                <th className="p-4">Баланс</th>
                                <th className="p-4">Действия</th>
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
                                            УДАЛИТЬ (KICK)
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