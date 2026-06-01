'use client';

import { useAlert } from '@/app/providers/AlertProvider';
import { useTranslation } from 'react-i18next';
import { UserProfile } from '@/entities/user';

export function useIncognitoCheck(user: UserProfile) {
    const { showAlert } = useAlert();
    const { t } = useTranslation();

    const requireIncognitoCheck = (action: () => void) => {
        if (user.gender === 'female' && !user.settings?.isIncognito) {
            showAlert({
                title: t('incognito_warn'),
                buttons: [
                    { text: t('alert_cancel'), style: 'cancel' },
                    { text: t('alert_yes'), style: 'destructive', onPress: action }
                ]
            });
        } else {
            action();
        }
    };

    return requireIncognitoCheck;
}

// 'use client';

import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, animate, useTransform } from 'framer-motion';
import { Search, Plus, Check, ArrowRight } from 'lucide-react';
// import { useTranslation } from 'react-i18next';

import { roomApi, GameRoom } from '@/entities/room';
// import { UserProfile } from '@/entities/user';
import { CreateRoomPayload } from '@/shared/api/contracts/payloads';
// import { useAlert } from '@/app/providers/AlertProvider';
import { MorphingCapsule, sharedSpringTransition } from '@/shared/ui/animations/MorphingCapsule';
import { CapsuleModal } from '@/shared/ui/overlays/CapsuleModal';
import { RoomConfigForm } from '@/features/room-config/ui/RoomConfigForm';
// import { useIncognitoCheck } from './useIncognitoCheck';

const DEFAULT_CONFIG: CreateRoomPayload = {
    name: '', betAmount: 100, turnDuration: 30000, requiredPlayers: 2,
    ruleSet: 'local', isStrict: true, isSuddenDeath: false, isPrivate: false,
    isJacksDealerReserved: false
};

const ADJECTIVES = ['Royal', 'Lucky', 'Golden', 'Wild', 'Epic', 'Mystic', 'Crazy'];
const NOUNS = ['Arena', 'Room', 'Table', 'Lounge', 'Club', 'Spot'];

function generateRandomRoomName() {
    return `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`;
}

export interface LobbyFloatingUIProps {
    user: UserProfile;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    onSearchResults: (rooms: GameRoom[] | null) => void;
    activeTab: 'my' | 'open';
    onTabChange: (tab: 'my' | 'open') => void;
    onSwipeProgress: (progress: number) => void;
}

export function LobbyFloatingUI({
    user,
    searchQuery,
    onSearchQueryChange,
    onSearchResults,
    activeTab,
    onTabChange,
    onSwipeProgress
}: LobbyFloatingUIProps) {
    const router = useRouter();
    const { showAlert } = useAlert();
    const { t } = useTranslation();
    const requireIncognitoCheck = useIncognitoCheck(user);

    const [view, setView] = React.useState<'none' | 'filter' | 'create'>('none');
    const [isSearchFocused, setIsSearchFocused] = React.useState(false);
    const [isDraggingTab, setIsDraggingTab] = React.useState(false);

    const [createConfig, setCreateConfig] = React.useState<CreateRoomPayload>({ ...DEFAULT_CONFIG });
    const [searchConfig, setSearchConfig] = React.useState<CreateRoomPayload>({ ...DEFAULT_CONFIG });
    const [defaultRoomName, setDefaultRoomName] = React.useState('');

    const lastViewRef = useRef<'filter' | 'create'>('filter');
    if (view === 'filter' || view === 'create') lastViewRef.current = view;

    const filterTimerRef = useRef<NodeJS.Timeout | null>(null);

    // --- ФИЗИКА КАМЕРА-СВАЙПЕРА ---
    const progress = useMotionValue(activeTab === 'open' ? 1 : 0);
    const startProgress = useRef(progress.get());

    const trackX = useTransform(progress, [0, 1], ['25%', '-25%']);
    const opacityMy = useTransform(progress, [0, 1], [1, 0.4]);
    const opacityOpen = useTransform(progress, [0, 1], [0.4, 1]);
    const scaleMy = useTransform(progress, [0, 1], [1, 0.85]);
    const scaleOpen = useTransform(progress, [0, 1], [0.85, 1]);

    useEffect(() => {
        if (!isDraggingTab) {
            animate(progress, activeTab === 'open' ? 1 : 0, { type: 'spring', bounce: 0.2, duration: 0.5 });
        }
    }, [activeTab, progress, isDraggingTab]);

    const handlePanStart = () => {
        clearFilterTimer();
        setIsDraggingTab(true);
        startProgress.current = progress.get(); // Запоминаем точку старта
    };

    const handlePan = (e: any, info: any) => {
        // Жестко задаем комфортную длину свайпа в 120 пикселей, а не привязываемся к ширине экрана
        const SWIPE_WIDTH = 120;
        const deltaProgress = -info.offset.x / SWIPE_WIDTH; // Влево = стремимся к 1

        let next = startProgress.current + deltaProgress;
        progress.set(Math.max(0, Math.min(1, next)));
        onSwipeProgress(progress.get());
    };

    const handlePanEnd = (e: any, info: any) => {
        setIsDraggingTab(false);
        const current = progress.get();
        const v = -info.velocity.x;
        let target = current;

        // Если дернули сильно — переключаем в сторону рывка
        if (v > 300) target = 1;
        else if (v < -300) target = 0;
        // Если протащили палец больше чем на 50% (60px) — переключаем
        else target = current > 0.5 ? 1 : 0;

        animate(progress, target, {
            type: 'spring', stiffness: 300, damping: 30,
            onUpdate: (v) => onSwipeProgress(v),
            onComplete: () => onTabChange(target === 0 ? 'my' : 'open')
        });
    };

    // --- ОСТАЛЬНАЯ ЛОГИКА ---
    React.useEffect(() => {
        document.body.style.overflow = view !== 'none' ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [view]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        filterTimerRef.current = setTimeout(() => setView('filter'), 500);
    };

    const clearFilterTimer = () => {
        if (filterTimerRef.current) {
            clearTimeout(filterTimerRef.current);
            filterTimerRef.current = null;
        }
    };

    // Опущенные для чистоты кода ваши методы API
    const handleCreateRoom = async () => {
        if (user.balance < createConfig.betAmount) {
            return showAlert({ title: t('lobby_not_enough_money'), buttons: [{ text: t('alert_ok'), style: "cancel" }] });
        }
        try {
            const finalName = (createConfig.name || '').trim() || defaultRoomName;
            const roomId = await roomApi.createRoom(
                user, finalName, createConfig.betAmount, createConfig.ruleSet || 'local',
                !!createConfig.isPrivate, !!createConfig.isStrict, !!createConfig.isSuddenDeath,
                createConfig.requiredPlayers || 2, createConfig.turnDuration || 60000
            );
            setView('none');
            router.push(`/game/${roomId}`);
        } catch (e: any) {
            showAlert({ title: `${t('lobby_create_error')} ${t(e.message)}`, buttons: [{ text: t('alert_ok'), style: "cancel" }] });
        }
    };

    const handleJoinPrivate = async () => {
        if (!searchQuery.trim()) return;
        const roomId = await roomApi.findPrivateRoom(searchQuery);
        if (roomId) {
            setView('none');
            router.push(`/game/${roomId}`);
        } else {
            showAlert({ title: t('lobby_room_not_found'), buttons: [{ text: t('alert_ok'), style: "cancel" }] });
        }
    };

    const handleApplyFilters = async () => {
        try {
            const results = await roomApi.searchRooms({
                bet: searchConfig.betAmount, speed: searchConfig.turnDuration,
                players: searchConfig.requiredPlayers, ruleSet: searchConfig.ruleSet,
                isStrict: searchConfig.isStrict, isSuddenDeath: searchConfig.ruleSet === 'local' ? searchConfig.isSuddenDeath : undefined
            });
            onSearchResults(results);
            setView('none');
        } catch (e: any) {
            showAlert({ title: `${t('lobby_error')} ${t(e.message)}`, buttons: [{ text: t('alert_ok'), style: "cancel" }] });
        }
    };


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

    const showPlus = !isSearchFocused && !isDraggingTab;
    const showCenter = !isSearchFocused;
    const showSearch = !isDraggingTab;

    return (
        <>
            <CapsuleModal
                isOpen={view !== 'none'}
                onClose={() => setView('none')}
                layoutId={lastViewRef.current === 'filter' ? "filter-capsule" : "create-btn"}
                headerLeft={renderLeftHeaderForModals()}
            >
                <div className="px-4 sm:px-6 pb-4">
                    {lastViewRef.current === 'filter' && <div className="mt-2"><RoomConfigForm config={searchConfig} onChange={(u) => setSearchConfig(p => ({ ...p, ...u }))} defaultRoomName={null} /></div>}
                    {lastViewRef.current === 'create' && <div className="mt-2"><RoomConfigForm config={createConfig} onChange={(u) => setCreateConfig(p => ({ ...p, ...u }))} defaultRoomName={defaultRoomName} /></div>}
                </div>
            </CapsuleModal>

            {view === 'none' && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4 z-80">

                    <AnimatePresence mode="popLayout">
                        <div className="flex justify-center gap-3 w-full max-w-md pointer-events-auto h-14 items-center">

                            {/* 1. ЛЕВАЯ КНОПКА ( + ) */}
                            {showPlus && (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={sharedSpringTransition}
                                    style={{ borderRadius: 9999 }}
                                    className="shrink-0 flex items-center h-14"
                                >
                                    <MorphingCapsule
                                        isCapsule
                                        layoutId="create-btn"
                                        style={{ borderRadius: 9999 }}
                                        transition={sharedSpringTransition}
                                        onClick={() => { setDefaultRoomName(generateRandomRoomName()); setView('create'); }}
                                        className="w-14 h-14 cursor-pointer shadow-lg bg-theme-primary flex items-center justify-center"
                                    >
                                        <Plus className="w-6 h-6 text-white" />
                                    </MorphingCapsule>
                                </motion.div>
                            )}

                            {/* 2. ЦЕНТРАЛЬНЫЙ КАМЕРА-СВАЙПЕР */}
                            {showCenter && (
                                <motion.div
                                    layoutId="filter-capsule"
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 30 }}
                                    transition={sharedSpringTransition}
                                    style={{ borderRadius: 9999 }}
                                    // Убран внутренний отступ (p-1.5), он перенесен внутрь
                                    className="flex-1 w-full overflow-hidden relative bg-theme-panel/80 backdrop-blur-2xl shadow-lg h-14 cursor-pointer touch-none select-none"
                                    onPointerDown={handlePointerDown}
                                    onPointerUp={clearFilterTimer}
                                    onPointerCancel={clearFilterTimer}
                                    onPointerLeave={clearFilterTimer}
                                    onPanStart={handlePanStart}
                                    onPan={handlePan}
                                    onPanEnd={handlePanEnd}
                                >
                                    {/* ВНУТРЕННИЙ ЖЕСТКИЙ КОНТЕЙНЕР
                                        168px = ширина боковых кнопок (112) + отступы и gap (56).
                                        Он не дает текстам и лупе растянуться, когда фоновая капсула расширяется
                                    */}
                                    <div className="relative mx-auto h-full w-[calc(100vw-168px)] max-w-[280px]">

                                        {/* Анимированная лупа (вложенная капсула) */}
                                        <motion.div
                                            // При свайпе отступы сверху/снизу становятся 0, заполняя высоту
                                            animate={{ top: isDraggingTab ? 0 : 6, bottom: isDraggingTab ? 0 : 6 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            className="absolute left-1/4 right-1/4 bg-theme-primary/20 rounded-full z-0 pointer-events-none"
                                        />

                                        {/* Подвижная лента с текстами */}
                                        <motion.div
                                            style={{ x: trackX }}
                                            className="absolute inset-y-0 w-full flex z-10 pointer-events-none"
                                        >
                                            <motion.div style={{ opacity: opacityMy, scale: scaleMy }} className="w-1/2 flex items-center justify-center px-2">
                                                <span className="font-bold text-theme-text text-[min(3.5vw,13px)] uppercase truncate drop-shadow-sm">Мои столы</span>
                                            </motion.div>

                                            <motion.div style={{ opacity: opacityOpen, scale: scaleOpen }} className="w-1/2 flex items-center justify-center px-2">
                                                <span className="font-bold text-theme-text text-[min(3.5vw,13px)] uppercase truncate drop-shadow-sm">Открытые</span>
                                            </motion.div>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}

                            {/* 3. ПРАВАЯ КНОПКА / ПОИСКОВИК */}
                            {showSearch && (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 30 }}
                                    transition={sharedSpringTransition}
                                    style={{ borderRadius: 9999 }}
                                    className={`relative flex items-center h-14 bg-theme-panel/80 backdrop-blur-2xl shadow-lg overflow-hidden ${isSearchFocused ? 'flex-1 w-full' : 'w-14 shrink-0'}`}
                                >
                                    <Search className={`absolute pointer-events-none transition-all duration-300 text-theme-text ${isSearchFocused ? 'left-4 w-5 h-5 opacity-60' : 'left-1/2 -translate-x-1/2 w-6 h-6 opacity-80 z-10'}`} />

                                    <input
                                        value={searchQuery}
                                        onChange={(e) => onSearchQueryChange(e.target.value.toUpperCase())}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        placeholder={t('lobby_search_table', 'Поиск стола')}
                                        className={`absolute inset-0 w-full h-full outline-none font-bold text-theme-text uppercase tracking-wider z-20 transition-colors ${isSearchFocused ? 'pl-12 pr-14 bg-transparent placeholder:opacity-60' : 'text-[0px] text-transparent bg-transparent cursor-pointer'
                                            }`}
                                    />

                                    <AnimatePresence>
                                        {isSearchFocused && searchQuery.trim().length > 0 && (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                                                onClick={() => requireIncognitoCheck(handleJoinPrivate)}
                                                className="absolute right-2 z-30 w-10 h-10 bg-theme-primary rounded-full flex items-center justify-center shadow-md hover:opacity-90"
                                            >
                                                <ArrowRight className="w-5 h-5 text-white" />
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                        </div>
                    </AnimatePresence>
                </div>
            )}
        </>
    );
}

// 'use client';

// import React from 'react';
import { createPortal } from 'react-dom';
// import { useRouter } from 'next/navigation';
// import { GameRoom, roomApi } from '@/entities/room';
// import { UserProfile } from '@/entities/user';
// import { useAlert } from '@/app/providers/AlertProvider';
// import { useTranslation } from 'react-i18next';

import { useLobbyData } from '../model/useLobbyData';
import { ActiveRoomsWidget } from './ActiveRoomsWidget';
import { OpenRoomsWidget } from './OpenRoomsWidget';
// import { LobbyFloatingUI } from './LobbyFloatingUI';
// import { useIncognitoCheck } from './useIncognitoCheck';

export default function LobbyWidget({ user }: { user: UserProfile }) {
    const router = useRouter();
    const { showAlert } = useAlert();
    const { t } = useTranslation();
    const requireIncognitoCheck = useIncognitoCheck(user);

    const { activeRooms, openRooms } = useLobbyData(user);

    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState<GameRoom[] | null>(null);
    const [isSurrendering, setIsSurrendering] = React.useState(false);

    const [portalNode, setPortalNode] = React.useState<HTMLElement | null>(null);
    const [masks, setMasks] = React.useState<Record<string, string>>({});

    const [activeTab, setActiveTab] = React.useState<'my' | 'open'>('open');
    const [swipeProgress, setSwipeProgress] = React.useState(1);

    React.useEffect(() => { setPortalNode(document.getElementById('overlay-lobby')); }, []);

    const fetchedMasks = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        activeRooms.forEach(r => {
            const roomId = r.id;
            if (roomId && !fetchedMasks.current.has(roomId)) {
                fetchedMasks.current.add(roomId);
                roomApi.getMyMask(roomId).then(mask => {
                    if (mask) setMasks(prev => ({ ...prev, [roomId]: mask }));
                }).catch(() => fetchedMasks.current.delete(roomId));
            }
        });
    }, [activeRooms]);

    const handleSurrender = (roomId: string, resetCard?: () => void) => {
        showAlert({
            title: t('lobby_surrender_confirm'),
            buttons: [
                { text: t('alert_cancel'), style: "cancel", onPress: () => resetCard?.() },
                {
                    text: t('alert_yes'), style: "destructive",
                    onPress: async () => {
                        setIsSurrendering(true);
                        try { await roomApi.leaveRoom(roomId); }
                        catch (e: any) {
                            showAlert({ title: `${t('lobby_error')} ${t(e.message)}`, buttons: [{ text: t('alert_ok'), style: "cancel" }] });
                            resetCard?.();
                        }
                        finally { setIsSurrendering(false); }
                    }
                }
            ]
        });
    };

    const handleClearSearch = () => {
        setSearchResults(null);
        setSearchQuery(''); // Это автоматически очистит инпут в LobbyFloatingUI
    };

    const filteredOpenRooms = openRooms.filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toUpperCase();
        return r.name?.toUpperCase().includes(q) || r.id?.toUpperCase().includes(q);
    });

    const displayedRooms = searchResults !== null ? searchResults : filteredOpenRooms;

    return (
        <div className="flex flex-col w-full">
            <h1 className="text-3xl font-black mb-8 text-theme-text">{t('lobby_title')}</h1>

            <ActiveRoomsWidget
                rooms={activeRooms}
                masks={masks}
                isSurrendering={isSurrendering}
                onSurrender={handleSurrender}
                onOpenRoom={(id) => requireIncognitoCheck(() => router.push(`/game/${id}`))}
            />

            <OpenRoomsWidget
                rooms={displayedRooms}
                title={searchResults !== null || searchQuery ? t('lobby_search_results') : undefined}
                onClear={searchResults !== null || searchQuery ? handleClearSearch : undefined}
                onOpenRoom={(id) => requireIncognitoCheck(() => router.push(`/game/${id}`))}
            />

            <div className="h-28 shrink-0 pointer-events-none w-full" aria-hidden="true" />

            {portalNode ? createPortal(
                <LobbyFloatingUI
                    user={user}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onSearchResults={setSearchResults}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onSwipeProgress={setSwipeProgress}
                />,
                portalNode
            ) : null}
        </div>
    );
}