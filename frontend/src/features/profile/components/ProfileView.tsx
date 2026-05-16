import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { gameApi } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { NavigationItem } from '@/components/ui/NavigationItem';

const EMOJIS = ['😎', '👽', '🤖', '🦊', '🐯', '👻', '🤡', '🤠'];

export default function ProfileView({ user }: { user: UserProfile }) {
    const { t } = useTranslation();
    const [isEditingEmoji, setIsEditingEmoji] = useState(false);

    const changeEmoji = async (emoji: string) => {
        await gameApi.updateUserEmoji(user.uid, emoji);
        setIsEditingEmoji(false);
    };

    return (
        <div className="p-4 sm:p-6 max-w-md mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black mb-2 sm:mb-6">{t('profile_title')}</h1>

            {/* 🟢 Главная карточка: без бордера, с хорошей тенью shadow-lg */}
            <div className="bg-theme-panel p-4 sm:p-6 rounded-3xl shadow-lg mb-4 sm:mb-6 text-center relative">
                <div
                    // 🟢 Аватар: убираем border, делаем его "вдавленным" (shadow-inner) или слегка выпуклым (shadow-md)
                    className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-theme-main rounded-full flex items-center justify-center text-4xl sm:text-5xl cursor-pointer hover:scale-105 transition-transform shadow-md"
                    onClick={() => setIsEditingEmoji(!isEditingEmoji)}
                >
                    {user.avatarEmoji || '😎'}
                </div>

                {isEditingEmoji && (
                    // 🟢 Попап эмодзи: сильная тень shadow-2xl, чтобы он "летал" над карточкой
                    <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 bg-theme-panel p-2 sm:p-3 rounded-2xl shadow-2xl flex gap-2 z-10">
                        {EMOJIS.map(e => (
                            <button key={e} onClick={() => changeEmoji(e)} className="text-xl sm:text-2xl hover:scale-125 transition-transform">{e}</button>
                        ))}
                    </div>
                )}

                <h2 className="text-xl sm:text-2xl font-black mt-3 sm:mt-4">{user.displayName}</h2>
                
                {/* 🟢 Плашка баланса: убрали бордер, добавили shadow-sm */}
                <div className="inline-flex items-center gap-2 mt-2 bg-theme-main px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm">
                    <span className="text-amber-500 font-black text-base sm:text-lg">{user.balance} 💰</span>
                    <button onClick={() => gameApi.addMoney(user.uid, 500)} className="text-xs bg-theme-primary text-white font-bold px-2 py-1 rounded-md shadow hover:opacity-80 transition-opacity">+</button>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {/* 🟢 Кнопка-карточка: мягкая тень, реакция на наведение */}
                <div className="bg-theme-panel p-4 sm:p-5 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <NavigationItem onClick={() => { /* router.push('/rules') */ }}>
                        <span className="font-bold text-base sm:text-lg">📜 {t('profile_rules')}</span>
                    </NavigationItem>
                </div>
            </div>
        </div>
    );
}