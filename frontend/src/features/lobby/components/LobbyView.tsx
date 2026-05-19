'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Check, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { gameApi } from '@/lib/supabase';
import { UserProfile, RuleSet, GameRoom } from '@/types';
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
    name: '',
    bet: 100, speed: 30000, players: 2, ruleSet: 'local' as RuleSet,
    isStrict: true, isSuddenDeath: false, isPrivate: false
};

const ADJECTIVES = ['Royal', 'Lucky', 'Golden', 'Wild', 'Epic', 'Mystic', 'Crazy'];
const NOUNS = ['Arena', 'Room', 'Table', 'Lounge', 'Club', 'Spot'];

function generateRandomRoomName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj} ${noun}`;
}

export default function LobbyView({ user }: { user: UserProfile }) {
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();
    const { t } = useTranslation();

    const { activeRooms, openRooms } = useLobbyData(user);

    const [view, setView] = useState<'none' | 'filter' | 'create'>('none');
    const [privateCode, setPrivateCode] = useState('');

    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [createConfig, setCreateConfig] = useState({ ...DEFAULT_CONFIG });
    const [searchConfig, setSearchConfig] = useState({ ...DEFAULT_CONFIG });
    const [defaultRoomName, setDefaultRoomName] = useState('');

    const [searchResults, setSearchResults] = useState<GameRoom[] | null>(null);
    const [isSurrendering, setIsSurrendering] = useState(false);
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
    const [masks, setMasks] = useState<Record<string, string>>({});

    const lastViewRef = useRef<'filter' | 'create'>('filter');
    if (view === 'filter' || view === 'create') lastViewRef.current = view;

    useEffect(() => { setPortalNode(document.getElementById('overlay-lobby')); }, []);

    useEffect(() => {
        document.body.style.overflow = view !== 'none' ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [view]);

    const fetchedMasks = useRef<Set<string>>(new Set());

    useEffect(() => {
        activeRooms.forEach(r => {
            const roomId = r.id;
            if (roomId && !fetchedMasks.current.has(roomId)) {
                fetchedMasks.current.add(roomId);
                gameApi.getMyMask(roomId).then(mask => {
                    if (mask) setMasks(prev => ({ ...prev, [roomId]: mask }));
                }).catch(() => fetchedMasks.current.delete(roomId));
            }
        });
    }, [activeRooms]);

    const requireIncognitoCheck = (action: () => void) => {
        if (user.gender === 'female' && !user.settings?.isIncognito) {
            showConfirm(t('incognito_warn'), action);
        } else action();
    };

    const handleCreateRoom = async () => {
        if (user.balance < createConfig.bet) return showAlert(t('lobby_not_enough_money'));
        try {
            const finalName = createConfig.name.trim() || defaultRoomName;
            const roomId = await gameApi.createRoom(
                user, finalName, createConfig.bet, createConfig.ruleSet,
                createConfig.isPrivate, createConfig.isStrict,
                createConfig.isSuddenDeath, createConfig.players, createConfig.speed
            );
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

    const handleApplyFilters = async () => {
        try {
            const results = await gameApi.searchRooms({
                bet: searchConfig.bet,
                speed: searchConfig.speed,
                players: searchConfig.players,
                ruleSet: searchConfig.ruleSet,
                isStrict: searchConfig.isStrict,
                isSuddenDeath: searchConfig.ruleSet === 'local' ? searchConfig.isSuddenDeath : undefined
            });
            setSearchResults(results);
            setView('none');
        } catch (e: any) {
            showAlert(`${t('lobby_error')} ${t(e.message)}`);
        }
    };

    const handleSurrender = (roomId: string, resetCard?: () => void) => {
        showConfirm(t('lobby_surrender_confirm'), async () => {
            setIsSurrendering(true);
            try { await gameApi.leaveRoom(roomId, 'surrender'); }
            catch (e: any) { showAlert(`${t('lobby_error')} ${t(e.message)}`); resetCard?.(); }
            finally { setIsSurrendering(false); }
        }, () => resetCard?.());
    };



    const handleClearSearch = () => {
        setSearchResults(null);
        setPrivateCode('');
    };

    const filteredOpenRooms = openRooms.filter(r => {
        if (!privateCode) return true;
        const q = privateCode.toUpperCase();
        return r.name?.toUpperCase().includes(q) || r.id?.toUpperCase().includes(q);
    });

    const displayedRooms = searchResults !== null ? searchResults : filteredOpenRooms;



    const renderLeftHeaderForModals = () => {
        if (lastViewRef.current === 'filter') return (
            <>
                <motion.button layout initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={handleApplyFilters} className="w-14 h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:opacity-90 rounded-full cursor-pointer">
                    <Check className="w-6 h-6 text-white" />
                </motion.button>
                <h2 className="text-xl sm:text-2xl font-black text-theme-text ml-4">{t('modal_search_title', 'Фильтры')}</h2>
            </>
        );

        if (lastViewRef.current === 'create') return (
            <>
                <motion.button layout initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={() => requireIncognitoCheck(handleCreateRoom)} className="w-14 h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:opacity-90 rounded-full cursor-pointer">
                    <Check className="w-6 h-6 text-white" />
                </motion.button>
                <h2 className="text-xl sm:text-2xl font-black text-theme-text ml-4">{t('modal_create_title', 'Новый стол')}</h2>
            </>
        );

        return null;
    };

    const floatingUI = (
        <>
            <CapsuleModal
                isOpen={view !== 'none'}
                onClose={() => setView('none')}
                layoutId={lastViewRef.current === 'filter' ? "filter-btn" : "create-btn"}
                headerLeft={renderLeftHeaderForModals()}
            >
                <div className="px-4 sm:px-6 pb-4">
                    {lastViewRef.current === 'filter' && (
                        <div className="mt-2">
                            <RoomConfigForm config={searchConfig} onChange={(u) => setSearchConfig(p => ({ ...p, ...u }))} isSearchMode={true} />
                        </div>
                    )}
                    {lastViewRef.current === 'create' && (
                        <div className="mt-2">
                            <RoomConfigForm config={createConfig} onChange={(u) => setCreateConfig(p => ({ ...p, ...u }))} isSearchMode={false} defaultRoomName={defaultRoomName} />
                        </div>
                    )}
                </div>
            </CapsuleModal>

            {view === 'none' && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4 z-80">
                    <div className="flex justify-center gap-3 w-full max-w-md pointer-events-auto h-14 items-center">

                        {!isSearchFocused && (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="shrink-0"
                                >
                                    <MorphingCapsule
                                        isCapsule
                                        layoutId="filter-btn"
                                        transition={sharedSpringTransition}
                                        onClick={() => setView('filter')}
                                        className="w-14 h-14 cursor-pointer shadow-lg bg-theme-panel/80 backdrop-blur-2xl flex items-center justify-center"
                                    >
                                        <SlidersHorizontal className="w-6 h-6 text-theme-text opacity-80" />
                                    </MorphingCapsule>
                                </motion.div>
                            </AnimatePresence>
                        )}


                        <motion.div
                            layoutId="search-bar"
                            transition={sharedSpringTransition}
                            className="relative flex-1 flex items-center h-14 bg-theme-panel/80 backdrop-blur-2xl shadow-lg rounded-full overflow-hidden"
                        >
                            <Search className="absolute left-4 w-5 h-5 opacity-60 text-theme-text pointer-events-none" />
                            <input
                                value={privateCode}
                                onChange={(e) => setPrivateCode(e.target.value.toUpperCase())}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                placeholder={t('lobby_search_table', 'Поиск стола')}
                                className="w-full h-full bg-transparent outline-none pl-12 pr-14 font-bold text-theme-text placeholder:opacity-60 uppercase tracking-wider"
                            />

                            <AnimatePresence>
                                {privateCode.trim().length > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        onClick={() => requireIncognitoCheck(handleJoinPrivate)}
                                        className="absolute right-2 w-10 h-10 bg-theme-primary rounded-full flex items-center justify-center shadow-md hover:opacity-90"

                                    >
                                        <ArrowRight className="w-5 h-5 text-white" />
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {!isSearchFocused && (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="shrink-0"
                                >
                                    <MorphingCapsule
                                        isCapsule
                                        layoutId="create-btn"
                                        transition={sharedSpringTransition}
                                        onClick={() => {
                                            setDefaultRoomName(generateRandomRoomName());
                                            setView('create');
                                        }}
                                        className="w-14 h-14 cursor-pointer shadow-lg bg-theme-primary flex items-center justify-center"
                                    >
                                        <Plus className="w-6 h-6 text-white" />
                                    </MorphingCapsule>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="flex flex-col w-full">
            <h1 className="text-3xl font-black mb-8 text-theme-text">{t('lobby_title')}</h1>

            <ActiveRoomsList
                rooms={activeRooms}
                masks={masks}
                isSurrendering={isSurrendering}
                onSurrender={handleSurrender}
                onOpenRoom={(id) => requireIncognitoCheck(() => router.push(`/game/${id}`))}
            />

            <OpenRoomsList
                rooms={searchResults !== null ? searchResults : displayedRooms}
                title={searchResults !== null || privateCode ? t('lobby_search_results') : undefined}
                onClear={searchResults !== null || privateCode ? handleClearSearch : undefined}
                onOpenRoom={(id) => requireIncognitoCheck(() => router.push(`/game/${id}`))}
            />

            <div className="h-28 shrink-0 pointer-events-none w-full" aria-hidden="true" />
            {portalNode ? createPortal(floatingUI, portalNode) : null}
        </div>
    );
}