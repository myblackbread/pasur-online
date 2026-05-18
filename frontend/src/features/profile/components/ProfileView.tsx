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
import EmojiPicker, { Theme, EmojiStyle, SkinTones } from 'emoji-picker-react';

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
                {/* 🟢 ИСПРАВЛЕНО: Вернули isCapsule={false} и targetRadius={9999} для идеального расширения круга */}
                <MorphingCapsule
                    isCapsule={false}
                    targetRadius={9999}
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
                        <div className="flex items-center gap-4">
                            <motion.button
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                onClick={() => changeEmoji(tempEmoji)}
                                className="w-14 h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:opacity-90 rounded-full cursor-pointer"
                            >
                                <Check className="w-6 h-6 text-white" />
                            </motion.button>
                            
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }}
                                className="text-4xl bg-theme-main w-14 h-14 rounded-full flex items-center justify-center shadow-inner shrink-0"
                            >
                                {tempEmoji}
                            </motion.div>
                        </div>
                    }
                >
                    <div className="w-full h-[calc(100%-5rem)] sm:h-[calc(100%-6rem)] flex flex-col">
                        <EmojiPicker 
                            onEmojiClick={(emojiData) => setTempEmoji(emojiData.emoji)}
                            autoFocusSearch={false}
                            theme={Theme.AUTO}
                            emojiStyle={EmojiStyle.NATIVE}
                            defaultSkinTone={SkinTones.NEUTRAL}
                            skinTonesDisabled={true}
                            previewConfig={{ showPreview: false }}
                            searchDisabled={true}
                            width="100%"
                            height="100%"
                            lazyLoadEmojis={true}
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                '--epr-bg-color': 'transparent',
                                '--epr-category-label-bg-color': 'transparent',
                                '--epr-picker-border-color': 'transparent'
                            } as React.CSSProperties}
                        />
                    </div>
                </CapsuleModal>
            )}
        </div>
    );
}