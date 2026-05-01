import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { fbManager } from '@/lib/supabaseManager';
import { useTranslation } from 'react-i18next';

const EMOJIS = ['😎', '👽', '🤖', '🦊', '🐯', '👻', '🤡', '🤠'];

export default function ProfileView({ user }: { user: UserProfile }) {
    const { t } = useTranslation();
    const [isEditingEmoji, setIsEditingEmoji] = useState(false);

    const changeEmoji = async (emoji: string) => {
        await fbManager.updateUserEmoji(user.uid, emoji);
        setIsEditingEmoji(false);
    };
    
    return (
        <div className="p-6 max-w-md mx-auto">
            <h1 className="text-3xl font-black mb-6">{t('profile_title')}</h1>

            <div className="bg-theme-panel p-6 rounded-3xl border-4 border-theme-border mb-6 text-center relative shadow-sm">
                <div
                    className="w-24 h-24 mx-auto bg-theme-main border-4 border-theme-border rounded-full flex items-center justify-center text-5xl cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setIsEditingEmoji(!isEditingEmoji)}
                >
                    {user.avatarEmoji || '😎'}
                </div>

                {isEditingEmoji && (
                    <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-theme-panel border-4 border-theme-border p-3 rounded-2xl shadow-xl flex gap-2 z-10">
                        {EMOJIS.map(e => (
                            <button key={e} onClick={() => changeEmoji(e)} className="text-2xl hover:scale-125 transition-transform">{e}</button>
                        ))}
                    </div>
                )}

                <h2 className="text-2xl font-black mt-4">{user.displayName}</h2>
                <div className="inline-flex items-center gap-2 mt-2 bg-theme-main border-2 border-theme-border px-4 py-2 rounded-full">
                    <span className="text-amber-500 font-black text-lg">{user.balance} 💰</span>
                    <button onClick={() => fbManager.addMoney(user.uid, 500)} className="text-xs bg-theme-primary text-white font-bold px-2 py-1 rounded-md hover:opacity-80 transition-opacity">+</button>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <button className="bg-theme-panel border-4 border-theme-border p-5 rounded-2xl flex justify-between items-center hover:bg-theme-main transition-colors font-bold">
                    <span>📜 {t('profile_rules')}</span>
                    <span className="opacity-50">❯</span>
                </button>
            </div>
        </div>
    );
}