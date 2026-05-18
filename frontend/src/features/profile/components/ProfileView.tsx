import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { gameApi } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { InscribedZone } from '@/components/ui/InscribedZone';
import { MorphingCapsule, sharedSpringTransition } from '@/components/ui/MorphingCapsule';
import { CapsuleModal } from '@/components/ui/CapsuleModal';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const EMOJIS = [
    '😎', '👽', '🤖', '🦊', '🐯', '👻', '🤡', '🤠',
    '🤓', '🤩', '🥸', '🤬', '🤯', '🥶', '😱', '🤫',
    '🦁', '🐶', '🐱', '🐭', '🐹', '🐰', '🐻', '🐼',
    '🐻‍❄️', '🐨', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦',
    '🦄', '🐴', '🐗', '🐺', '🦇', '🦉', '🦅', '🦆',
    '🍎', '🍕', '🍔', '🍟', '🌭', '🍿', '🥓', '🌮',
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉'
];

export default function ProfileView({ user }: { user: UserProfile }) {
    const { t } = useTranslation();
    const [isEditingEmoji, setIsEditingEmoji] = useState(false);
    const [tempEmoji, setTempEmoji] = useState(user.avatarEmoji || '😎');
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalNode(document.getElementById('overlay-root'));
    }, []);

    const changeEmoji = async (emoji: string) => {
        setIsEditingEmoji(false);
        await gameApi.updateUserEmoji(user.uid, emoji);
    };

    return (
        <div className="flex flex-col w-full">
            <h1 className="text-2xl sm:text-3xl font-black mb-6">{t('profile_title')}</h1>

            <Panel variant="elevated" padding="lg" className="text-center">
                {/* 🟢 ИСПРАВЛЕНО: Убрали targetRadius={9999} и включили isCapsule */}
                <MorphingCapsule
                    isCapsule
                    layoutId="avatar-editor"
                    transition={sharedSpringTransition}
                    onClick={() => {
                        setTempEmoji(user.avatarEmoji || '😎');
                        setIsEditingEmoji(true);
                    }}
                    className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-theme-main rounded-full cursor-pointer shadow-lg relative hover:shadow-xl transition-shadow"
                >
                    <InscribedZone>
                        <span className="text-5xl sm:text-6xl leading-none">{user.avatarEmoji || '😎'}</span>
                    </InscribedZone>
                </MorphingCapsule>

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

            {portalNode && (
                <CapsuleModal
                    isOpen={isEditingEmoji}
                    onClose={() => setIsEditingEmoji(false)}
                    layoutId="avatar-editor"
                    portalNode={portalNode}
                    headerLeft={
                        <motion.button
                            layoutId="avatar-confirm-btn"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            onClick={() => changeEmoji(tempEmoji)}
                            className="w-14 h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:opacity-90 rounded-full cursor-pointer"
                        >
                            <Check className="w-6 h-6 text-white" />
                        </motion.button>
                    }
                >
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-3 sm:gap-4 pt-4 pb-12 justify-items-center">
                        {EMOJIS.map(e => (
                            <button
                                key={e}
                                onClick={() => setTempEmoji(e)}
                                className={`w-14 h-14 sm:w-16 sm:h-16 text-3xl sm:text-4xl flex items-center justify-center rounded-2xl transition-all ${
                                    tempEmoji === e 
                                        ? 'bg-theme-primary/20 scale-110 shadow-inner border border-theme-primary/30' 
                                        : 'hover:scale-110 hover:bg-theme-main/50'
                                }`}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </CapsuleModal>
            )}
        </div>
    );
}