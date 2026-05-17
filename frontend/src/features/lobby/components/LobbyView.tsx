'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Check } from 'lucide-react';
import { gameApi } from '@/lib/supabase';
import { UserProfile, RuleSet } from '@/types';
import { useAlert } from '@/components/providers/AlertProvider';
import { useTranslation } from 'react-i18next';
import { MorphingCapsule, sharedSpringTransition } from '@/components/ui/MorphingCapsule';
import { CapsuleModal } from '@/components/ui/CapsuleModal';
import { InscribedZone } from '@/components/ui/InscribedZone';

import { useLobbyData } from '../hooks/useLobbyData';
import { ActiveRoomsList } from './lists/ActiveRoomsList';
import { OpenRoomsList } from './lists/OpenRoomsList';
import { RoomConfigForm } from './modals/RoomConfigForm';
import { SearchHeader } from './modals/SearchHeader';

const DEFAULT_CONFIG = {
    bet: 100, speed: 30000, players: 2, ruleSet: 'local' as RuleSet,
    isStrict: true, isSuddenDeath: false, isPrivate: false
};

export default function LobbyView({ user }: { user: UserProfile }) {
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();
    const { t } = useTranslation();

    const { activeRooms, openRooms } = useLobbyData(user);

    const [view, setView] = useState<'none' | 'search' | 'create'>('none');
    const [privateCode, setPrivateCode] = useState('');
    const [createConfig, setCreateConfig] = useState({ ...DEFAULT_CONFIG });
    const [searchConfig, setSearchConfig] = useState({ ...DEFAULT_CONFIG });

    const [isSurrendering, setIsSurrendering] = useState(false);
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    const lastViewRef = useRef<'search' | 'create'>('search');
    if (view === 'search' || view === 'create') lastViewRef.current = view;

    useEffect(() => { setPortalNode(document.getElementById('overlay-lobby')); }, []);

    useEffect(() => {
        document.body.style.overflow = view !== 'none' ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [view]);

    const requireIncognitoCheck = (action: () => void) => {
        if (user.gender === 'female' && !user.settings?.isIncognito) {
            showConfirm(t('incognito_warn'), action);
        } else action();
    };

    const handleCreateRoom = async () => {
        if (user.balance < createConfig.bet) return showAlert(t('lobby_not_enough_money'));
        try {
            const roomId = await gameApi.createRoom(user, createConfig.bet, createConfig.ruleSet, createConfig.isPrivate, createConfig.isStrict, createConfig.isSuddenDeath, createConfig.players, createConfig.speed);
            setView('none');
            router.push(`/game/${roomId}`);
        } catch (e: any) { showAlert(`${t('lobby_create_error')} ${t(e.message)}`); }
    };

    const handleJoinPrivate = async () => {
        if (!privateCode.trim()) return;
        const roomId = await gameApi.findPrivateRoom(privateCode);
        if (roomId) {
            setView('none');
            router.push(`/game/${roomId}`);
        } else showAlert(t('lobby_room_not_found'));
    };

    const handleSurrender = (roomId: string, resetCard?: () => void) => {
        showConfirm(t('lobby_surrender_confirm'), async () => {
            setIsSurrendering(true);
            try { await gameApi.leaveRoom(roomId, 'surrender'); } 
            catch (e: any) { showAlert(`${t('lobby_error')} ${t(e.message)}`); resetCard?.(); } 
            finally { setIsSurrendering(false); }
        }, () => resetCard?.());
    };

    const renderLeftHeaderForModals = () => {
        if (lastViewRef.current === 'search') return <SearchHeader privateCode={privateCode} setPrivateCode={setPrivateCode} onApplyFilters={() => setView('none')} onJoinPrivate={() => requireIncognitoCheck(handleJoinPrivate)} />;
        if (lastViewRef.current === 'create') return (
            <>
                <motion.button layoutId="create-left-action" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={() => requireIncognitoCheck(handleCreateRoom)} className="w-14 h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:opacity-90 rounded-full cursor-pointer">
                    <Check className="w-6 h-6 text-white" />
                </motion.button>
                <div className="flex-1" />
            </>
        );
        return null;
    };

    const floatingUI = (
        <>
            <CapsuleModal 
                isOpen={view !== 'none'} 
                onClose={() => setView('none')} 
                layoutId={lastViewRef.current === 'search' ? "search-wrapper" : "create-wrapper"} 
                closeButtonLayoutId={lastViewRef.current === 'search' ? "create-wrapper" : undefined} 
                headerLeft={renderLeftHeaderForModals()}
            >
                {lastViewRef.current === 'search' && <div className="mt-2"><RoomConfigForm config={searchConfig} onChange={(u) => setSearchConfig(p => ({...p, ...u}))} isSearchMode={true} /></div>}
                {lastViewRef.current === 'create' && <RoomConfigForm config={createConfig} onChange={(u) => setCreateConfig(p => ({...p, ...u}))} isSearchMode={false} />}
            </CapsuleModal>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4 z-[80]">
                <AnimatePresence>
                    {view === 'none' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-center gap-3 w-full max-w-md pointer-events-auto">
                            <MorphingCapsule isCapsule layoutId="search-wrapper" transition={sharedSpringTransition} onClick={() => setView('search')} className="relative flex-1 max-w-[280px] h-14 cursor-pointer shadow-lg hover:shadow-xl transition-shadow">
                                <div className="absolute inset-0 bg-theme-panel/80 backdrop-blur-2xl shadow-sm -z-10" />
                                <InscribedZone align="left" className="gap-2">
                                    <Search className="w-5 h-5 opacity-60 shrink-0 text-theme-text" />
                                    <span className="font-bold text-sm sm:text-base opacity-80 whitespace-nowrap text-theme-text">{t('lobby_game_code') || 'Код или Поиск'}</span>
                                </InscribedZone>
                            </MorphingCapsule>
                            <MorphingCapsule isCapsule layoutId="create-wrapper" transition={sharedSpringTransition} onClick={() => setView('create')} className="relative w-14 h-14 cursor-pointer shadow-lg hover:shadow-xl transition-shadow">
                                <div className="absolute inset-0 bg-theme-primary backdrop-blur-xl -z-10" />
                                <InscribedZone><motion.div layoutId="action-icon" transition={sharedSpringTransition}><Plus className="w-6 h-6 text-white" /></motion.div></InscribedZone>
                            </MorphingCapsule>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );

    return (
        <div className="flex flex-col w-full">
            <h1 className="text-3xl font-black mb-8 text-theme-text">{t('lobby_title')}</h1>
            <ActiveRoomsList 
                rooms={activeRooms} 
                isSurrendering={isSurrendering} 
                onSurrender={handleSurrender} 
                onOpenRoom={(id) => requireIncognitoCheck(() => router.push(`/game/${id}`))} 
            />
            <OpenRoomsList 
                rooms={openRooms} 
                onOpenRoom={(id) => requireIncognitoCheck(() => router.push(`/game/${id}`))} 
            />
            <div className="h-28 shrink-0 pointer-events-none w-full" aria-hidden="true" />
            {portalNode ? createPortal(floatingUI, portalNode) : null}
        </div>
    );
}