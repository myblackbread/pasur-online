import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { gameApi } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { InscribedZone } from '@/components/ui/InscribedZone'; // <-- ИМПОРТ

const EMOJIS = ['😎', '👽', '🤖', '🦊', '🐯', '👻', '🤡', '🤠'];

export default function ProfileView({ user }: { user: UserProfile }) {
    const { t } = useTranslation();
    const [isEditingEmoji, setIsEditingEmoji] = useState(false);

    const changeEmoji = async (emoji: string) => {
        await gameApi.updateUserEmoji(user.uid, emoji);
        setIsEditingEmoji(false);
    };

    return (
        <div className="p-4 sm:p-6 max-w-md mx-auto h-full flex flex-col justify-center pb-24">
            <h1 className="text-2xl sm:text-3xl font-black mb-6 text-center">{t('profile_title')}</h1>

            <Panel variant="elevated" padding="lg" className="text-center">
                <div
                    // Убрали border-4, добавили shadow-lg и relative
                    className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-theme-main rounded-full cursor-pointer hover:scale-105 transition-transform shadow-lg relative"
                    onClick={() => setIsEditingEmoji(!isEditingEmoji)}
                >
                    {/* Геометрически точное центрирование без паддингов */}
                    <InscribedZone>
                        <span className="text-5xl sm:text-6xl leading-none">{user.avatarEmoji || '😎'}</span>
                    </InscribedZone>
                </div>

                {isEditingEmoji && (
                    <Panel className="absolute top-36 sm:top-44 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-3 z-20 w-64 shadow-2xl">
                        {EMOJIS.map(e => (
                            <button key={e} onClick={() => changeEmoji(e)} className="text-2xl sm:text-3xl hover:scale-125 transition-transform">{e}</button>
                        ))}
                    </Panel>
                )}

                <h2 className="text-2xl sm:text-3xl font-black mt-6 mb-2">{user.displayName}</h2>
                <div className="text-theme-text opacity-50 font-bold font-mono text-xs mb-6">ID: {user.uid.substring(0, 8)}</div>
                
                <div className="inline-flex items-center gap-3 bg-theme-main px-5 py-3 rounded-2xl shadow-inner">
                    <span className="text-amber-500 font-black text-xl sm:text-2xl">{user.balance} 💰</span>
                    <div className="w-[2px] h-6 bg-theme-panel shadow-sm rounded-full"></div>
                    <Button size="sm" fullWidth={false} onClick={() => gameApi.addMoney(user.uid, 500)}>
                        + GET
                    </Button>
                </div>
            </Panel>
        </div>
    );
}