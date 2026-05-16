'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Check, ChevronRight, Trash2, LogOut } from 'lucide-react';
import { gameApi, realtimeApi } from '@/lib/supabase';
import { GameRoom, UserProfile, RuleSet } from '@/types';
import { GAME_CONFIG } from '@/utils/constants';
import { useAlert } from '@/components/providers/AlertProvider';
import { useTranslation } from 'react-i18next';
import { MorphingCapsule, sharedSpringTransition } from '@/components/ui/MorphingCapsule';
import { AppleToggle } from '@/components/ui/AppleToggle';
import { SwipeableActionCard } from '@/components/ui/SwipeableActionCard';
import { CapsuleModal } from '@/components/ui/CapsuleModal';
import { NavigationItem } from '@/components/ui/NavigationItem';
import { InscribedZone } from '@/components/ui/InscribedZone';

const DEFAULT_CONFIG = {
    bet: 100, speed: 30000, players: 2, ruleSet: 'local' as RuleSet,
    isStrict: true, isSuddenDeath: false, isPrivate: false
};

export default function LobbyView({ user }: { user: UserProfile }) {
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();
    const { t } = useTranslation();

    const [rooms, setRooms] = useState<GameRoom[]>([]);
    const [activeRooms, setActiveRooms] = useState<GameRoom[]>([]);

    const [view, setView] = useState<'none' | 'search' | 'create'>('none');

    const [privateCode, setPrivateCode] = useState('');
    const [createConfig, setCreateConfig] = useState({ ...DEFAULT_CONFIG });
    const [searchConfig, setSearchConfig] = useState({ ...DEFAULT_CONFIG });

    const [isInputActive, setIsInputActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const [isSurrendering, setIsSurrendering] = useState(false);

    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    const hasText = privateCode.trim().length > 0;

    const closeView = () => {
        setView('none');
    };

    useEffect(() => {
        setPortalNode(document.getElementById('overlay-lobby'));
    }, []);

    useEffect(() => {
        document.body.style.overflow = view !== 'none' ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [view]);

    useEffect(() => {
        if (view === 'search' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [view]);

    useEffect(() => {
        const unsub = realtimeApi.subscribeToPublicRooms(setRooms);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!user.activeRooms?.length) { setActiveRooms([]); return; }
        const unsub = realtimeApi.subscribeToRoomsByIds(user.activeRooms, setActiveRooms);
        return () => unsub();
    }, [user.activeRooms]);

    const requireIncognitoCheck = (action: () => void) => {
        if (user.gender === 'female' && !user.settings?.isIncognito) {
            showConfirm(t('incognito_warn'), action);
        } else {
            action();
        }
    };

    const handleCreateRoomSubmit = async () => {
        if (user.balance < createConfig.bet) return showAlert(t('lobby_not_enough_money'));
        try {
            const roomId = await gameApi.createRoom(
                user, createConfig.bet, createConfig.ruleSet, createConfig.isPrivate,
                createConfig.isStrict, createConfig.isSuddenDeath, createConfig.players, createConfig.speed
            );
            closeView();
            router.push(`/game/${roomId}`);
        } catch (e: any) { showAlert(`${t('lobby_create_error')} ${t(e.message)}`); }
    };

    const handleJoinPrivate = async () => {
        if (!privateCode.trim()) return;
        const roomId = await gameApi.findPrivateRoom(privateCode);
        if (roomId) router.push(`/game/${roomId}`);
        else showAlert(t('lobby_room_not_found'));
    };

    const handleApplySearchFilters = () => {
        console.log('Поиск по фильтрам:', searchConfig);
        closeView();
    };

    const updateSearchFilter = (updates: any) => {
        setSearchConfig(prev => ({ ...prev, ...updates }));
    };

    const handleSurrenderActive = (roomId: string, resetCard?: () => void) => {
        showConfirm(
            t('lobby_surrender_confirm'),
            async () => {
                setIsSurrendering(true);
                try {
                    await gameApi.leaveRoom(roomId, 'surrender');
                } catch (e: any) {
                    showAlert(`${t('lobby_error')} ${t(e.message)}`);
                    resetCard?.(); 
                } finally {
                    setIsSurrendering(false);
                }
            },
            () => {
                resetCard?.();
            }
        );
    };

    const renderSettingsForm = (config: any, setConfig: any, isSearchMode: boolean) => {
        const updateFn = isSearchMode ? updateSearchFilter : setConfig;

        return (
            <div className="space-y-6">
                <h3 className="text-2xl font-black text-theme-text mb-2">
                    {isSearchMode ? "Фильтры поиска" : t('modal_setup_title')}
                </h3>

                <div>
                    <label className="block font-bold text-theme-text opacity-50 mb-2 text-sm uppercase tracking-wider">{t('modal_bet_label')}</label>
                    <div className="flex flex-wrap gap-2">
                        {GAME_CONFIG.BET_OPTIONS.map(b => (
                            <button
                                key={b}
                                onClick={() => updateFn({ ...config, bet: b })}
                                className={`flex-1 min-w-[70px] py-3 rounded-2xl font-black transition-all ${config.bet === b ? 'bg-amber-500 text-white shadow-md' : 'bg-theme-main text-theme-text shadow-sm hover:shadow-md'}`}
                            >
                                {b}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block font-bold text-theme-text opacity-50 mb-2 text-sm uppercase tracking-wider">{t('modal_speed_label')}</label>
                    <div className="flex gap-2">
                        {GAME_CONFIG.SPEED_OPTIONS.map(s => (
                            <button
                                key={s.value}
                                onClick={() => updateFn({ ...config, speed: s.value })}
                                className={`flex-1 p-3 rounded-2xl flex flex-col items-center justify-center transition-all ${config.speed === s.value ? 'bg-theme-primary text-white shadow-md' : 'bg-theme-main text-theme-text shadow-sm hover:shadow-md'}`}
                            >
                                <span className="text-2xl mb-1">{s.icon}</span>
                                <span className="text-xs font-bold whitespace-nowrap">{t(s.labelKey)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-theme-main shadow-sm p-4 rounded-3xl flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-shadow" onClick={() => updateFn({ ...config, players: config.players === 2 ? 4 : 2 })}>
                        <div className="text-3xl">{config.players === 2 ? '👥' : '👨‍👩‍👧‍👦'}</div>
                        <div className="font-bold text-sm text-theme-text">{config.players} {t('modal_players_count')}</div>
                    </div>
                    <div className="bg-theme-main shadow-sm p-4 rounded-3xl flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                            const newRule = config.ruleSet === 'local' ? 'classic' : 'local';
                            updateFn({ ...config, ruleSet: newRule, isSuddenDeath: newRule === 'classic' ? false : config.isSuddenDeath });
                        }}
                    >
                        <div className="text-3xl">{config.ruleSet === 'local' ? '🏡' : '🏛️'}</div>
                        <div className="font-bold text-sm text-theme-text">{config.ruleSet === 'local' ? t('rule_local') : t('rule_classic')}</div>
                    </div>
                </div>

                <div className="flex flex-col gap-1 bg-theme-main shadow-inner p-2 rounded-3xl">
                    <label className="flex justify-between items-center cursor-pointer p-3 hover:bg-theme-panel rounded-2xl transition-colors">
                        <span className="font-bold text-theme-text">⚖️ {t('modal_strict_mode')}</span>
                        <AppleToggle checked={config.isStrict} onChange={v => updateFn({ ...config, isStrict: v })} />
                    </label>
                    {config.ruleSet === 'local' && (
                        <label className="flex justify-between items-center cursor-pointer p-3 hover:bg-theme-panel rounded-2xl transition-colors">
                            <span className="font-bold text-theme-text">⚡ {t('modal_sudden_death')}</span>
                            <AppleToggle checked={config.isSuddenDeath} onChange={v => updateFn({ ...config, isSuddenDeath: v })} />
                        </label>
                    )}
                    <label className="flex justify-between items-center cursor-pointer p-3 hover:bg-theme-panel rounded-2xl transition-colors">
                        <span className="font-bold text-theme-text">🔒 {t('modal_private_table')}</span>
                        <AppleToggle checked={config.isPrivate} onChange={v => updateFn({ ...config, isPrivate: v })} />
                    </label>
                </div>
            </div>
        );
    };

    const isSearch = view === 'search';
    const isCreate = view === 'create';

    const renderLeftArea = () => {
        if (isSearch) {
            return (
                <div className="flex-1 flex items-center overflow-hidden">
                    <AnimatePresence>
                        {!isInputActive && !hasText && (
                            <motion.button
                                key="filter-action-btn"
                                layout
                                initial={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
                                animate={{ opacity: 1, scale: 1, width: 56, marginRight: 12 }}
                                exit={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
                                transition={sharedSpringTransition}
                                onClick={handleApplySearchFilters}
                                style={{ borderRadius: 9999 }}
                                className="h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer hover:opacity-90"
                            >
                                <Check className="w-6 h-6 text-white shrink-0" />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <motion.div
                        layout
                        transition={sharedSpringTransition}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: !isInputActive && !hasText ? 0.7 : 1 }}
                        style={{ borderRadius: 9999 }}
                        onClick={() => inputRef.current?.focus()}
                        className={`relative flex-1 h-14 transition-shadow duration-300 overflow-hidden ${!isInputActive && !hasText ? 'cursor-pointer shadow-sm' : 'cursor-text shadow-inner'}`}
                    >
                        <div className={`absolute inset-0 transition-colors duration-300 -z-10 ${!isInputActive && !hasText ? 'bg-theme-main' : 'bg-theme-panel'}`} />
                        <div className="relative z-10 w-full h-full flex items-center px-4">
                            <Search className="w-5 h-5 text-theme-text opacity-50 mr-2 shrink-0" />
                            <input
                                ref={inputRef}
                                value={privateCode}
                                onChange={e => setPrivateCode(e.target.value.toUpperCase())}
                                onFocus={() => setIsInputActive(true)}
                                onBlur={() => setIsInputActive(false)}
                                onKeyDown={(e) => e.key === 'Enter' && requireIncognitoCheck(handleJoinPrivate)}
                                placeholder={t('lobby_game_code') || "Введите код"}
                                className="select-text bg-transparent border-none outline-none w-full text-theme-text placeholder:text-theme-text placeholder:opacity-50 font-medium text-lg uppercase tracking-wider"
                            />
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {hasText && (
                            <motion.button
                                key="text-action-btn"
                                layout
                                initial={{ opacity: 0, scale: 0.5, width: 0, marginLeft: 0 }}
                                animate={{ opacity: 1, scale: 1, width: 56, marginLeft: 12 }}
                                exit={{ opacity: 0, scale: 0.5, width: 0, marginLeft: 0 }}
                                transition={sharedSpringTransition}
                                onClick={() => requireIncognitoCheck(handleJoinPrivate)}
                                style={{ borderRadius: 9999 }}
                                className="h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md cursor-pointer hover:opacity-90"
                            >
                                <Check className="w-6 h-6 text-white shrink-0" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        if (isCreate) {
            return (
                <>
                    <motion.button
                        layoutId="create-left-action"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.1 } }}
                        style={{ borderRadius: 9999 }}
                        onClick={() => requireIncognitoCheck(handleCreateRoomSubmit)}
                        className="w-14 h-14 bg-theme-primary flex items-center justify-center shrink-0 shadow-md hover:opacity-90 transition-opacity overflow-hidden cursor-pointer"
                    >
                        <Check className="w-6 h-6 text-white" />
                    </motion.button>
                    <div className="flex-1" />
                </>
            );
        }
        return null;
    };

    const floatingUI = (
        <>
            <CapsuleModal
                isOpen={view !== 'none'}
                onClose={closeView}
                layoutId={view === 'search' ? "search-wrapper" : (view === 'create' ? "create-wrapper" : "empty-wrapper")}
                closeButtonLayoutId={view === 'search' ? "create-wrapper" : undefined}
                headerLeft={renderLeftArea()}
            >
                {isSearch && (
                    <div className="mt-2">
                        {renderSettingsForm(searchConfig, setSearchConfig, true)}
                    </div>
                )}

                {isCreate && renderSettingsForm(createConfig, setCreateConfig, false)}
            </CapsuleModal>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4" style={{ zIndex: 80 }}>
                <AnimatePresence>
                    {view === 'none' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                            className="flex justify-center gap-3 w-full max-w-md pointer-events-auto"
                        >
                            <MorphingCapsule
                                isCapsule
                                layoutId="search-wrapper"
                                transition={sharedSpringTransition}
                                onClick={() => setView('search')}
                                className="relative flex-1 max-w-[280px] h-14 cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
                            >
                                <div className="absolute inset-0 bg-theme-panel/80 backdrop-blur-2xl shadow-sm -z-10" />
                                {/* Математически точная зона выравнивания без грубых паддингов */}
                                <InscribedZone align="left" className="gap-2">
                                    <Search className="w-5 h-5 text-theme-text opacity-60 shrink-0" />
                                    <span className="text-theme-text font-bold text-sm sm:text-base whitespace-nowrap opacity-80">
                                        {t('lobby_game_code') || 'Код стола или Поиск'}
                                    </span>
                                </InscribedZone>
                            </MorphingCapsule>

                            <MorphingCapsule
                                isCapsule
                                layoutId="create-wrapper"
                                transition={sharedSpringTransition}
                                onClick={() => setView('create')}
                                className="relative w-14 h-14 cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
                            >
                                <div className="absolute inset-0 bg-theme-primary backdrop-blur-xl -z-10" />
                                <InscribedZone>
                                    <motion.div layoutId="action-icon" transition={sharedSpringTransition}>
                                        <Plus className="w-6 h-6 text-white" />
                                    </motion.div>
                                </InscribedZone>
                            </MorphingCapsule>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );

    return (
        <div className="w-full min-h-full font-sans relative pb-32">
            <div className="w-full max-w-4xl mx-auto px-4 pt-6 sm:pt-12">
                <h1 className="text-3xl font-black mb-8 text-theme-text">{t('lobby_title')}</h1>

                {activeRooms.length > 0 && (
                    <div className="mb-8">
                        <div className="w-full space-y-3">
                            {activeRooms.map(room => {
                                const roomId = room.id;
                                if (!roomId) return null;

                                const isFinished = room.status === 'finished' || room.status === 'waiting';
                                const actionText = isFinished ? t('btn_leave') || 'Выйти' : t('btn_surrender') || 'Сдаться';

                                return (
                                    <SwipeableActionCard
                                        key={roomId}
                                        isActionLoading={isSurrendering}
                                        actionBgColor="bg-red-500 hover:bg-red-600 active:bg-red-700"
                                        onClick={() => router.push(`/game/${roomId}`)}
                                        onAction={(resetCard) => handleSurrenderActive(roomId, resetCard)}
                                        actionContent={
                                            <div className="flex flex-col items-center justify-center whitespace-nowrap px-4">
                                                {isFinished ? <LogOut className="w-5 h-5 mb-0.5" /> : <Trash2 className="w-5 h-5 mb-0.5" />}
                                                <span className="text-[10px] uppercase tracking-wider">{actionText}</span>
                                            </div>
                                        }
                                    >
                                        <div className="bg-theme-panel p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-row justify-between items-center gap-4 cursor-pointer active:scale-[0.98] transition-all duration-300">
                                            <div className="flex-1 text-left min-w-0">
                                                <div className="font-bold text-lg text-theme-text flex items-center gap-2">
                                                    <span>⏳</span> {t('lobby_your_table') || 'Ваша игра'}
                                                </div>
                                                <div className="text-sm text-theme-text opacity-70 font-medium mt-1 truncate">
                                                    {room.status === 'paused' ? t('status_paused') :
                                                        room.status === 'pause_requested' ? t('status_pause_req') :
                                                            room.status === 'finished' ? t('status_finished') : t('status_playing')}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-amber-500 font-black text-xl">{room.betAmount} 💰</div>
                                                <ChevronRight className="w-5 h-5 text-theme-text opacity-50" />
                                            </div>
                                        </div>
                                    </SwipeableActionCard>
                                );
                            })}
                        </div>
                    </div>
                )}

                <h2 className="text-xl font-bold mb-4 text-theme-text opacity-70">{t('lobby_open_tables')}</h2>
                <div className="grid gap-3 sm:gap-4 w-full">
                    {rooms.length === 0 ? (
                        <div className="text-center py-12 text-theme-text opacity-50 shadow-inner rounded-3xl font-bold">
                            {t('lobby_no_active')}
                        </div>
                    ) : (
                        rooms.map(room => {
                            const roomId = room.id;
                            if (!roomId) return null;

                            return (
                                <div
                                    key={roomId}
                                    className="bg-theme-panel p-3 sm:p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                                >
                                    <NavigationItem
                                        onClick={() => requireIncognitoCheck(() => router.push(`/game/${roomId}`))}
                                        rightContent={<span className="font-black text-lg sm:text-xl text-amber-500 whitespace-nowrap">{room.betAmount} 💰</span>}
                                    >
                                        <div className="text-xl sm:text-2xl shrink-0 bg-theme-main w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-inner">
                                            🎲
                                        </div>

                                        <div className="min-w-0 flex flex-col justify-center text-left">
                                            <div className="font-bold text-base sm:text-lg text-theme-text truncate w-full">
                                                {t('lobby_table') || 'Игровой стол'}
                                            </div>
                                            <div className="text-[10px] sm:text-xs text-theme-text opacity-70 font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
                                                <span className="bg-theme-main px-2 py-0.5 rounded-md shadow-sm">
                                                    {room.ruleSet === 'classic' ? t('rule_classic') : t('rule_local')}
                                                </span>
                                                {room.isStrict && <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md font-bold">{t('rule_strict')}</span>}
                                                {room.isSuddenDeath && <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md font-bold">⚡</span>}
                                                <span className="text-theme-primary font-bold ml-1">({room.players.length}/{room.maxPlayers})</span>
                                            </div>
                                        </div>
                                    </NavigationItem>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {portalNode ? createPortal(floatingUI, portalNode) : null}
        </div>
    );
}