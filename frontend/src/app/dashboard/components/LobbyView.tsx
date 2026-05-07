import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fbManager } from '@/lib/supabaseManager';
import { GameRoom, UserProfile, RuleSet, GAME_CONFIG } from '@/types';
import { useAlert } from '@/components/AlertProvider';
import { useTranslation } from 'react-i18next';

export default function LobbyView({ user }: { user: UserProfile }) {
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();
    const { t } = useTranslation();
    const [rooms, setRooms] = useState<GameRoom[]>([]);
    const [activeRooms, setActiveRooms] = useState<GameRoom[]>([]);
    const [privateCode, setPrivateCode] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSurrendering, setIsSurrendering] = useState(false);
    
    const [createConfig, setCreateConfig] = useState({
        bet: 100,
        speed: 30000,
        players: 2,
        ruleSet: 'local' as RuleSet,
        isStrict: true,
        isSuddenDeath: false,
        isPrivate: false
    });

    const handleCreateRoomSubmit = async () => {
        if (user.balance < createConfig.bet) return showAlert(t('lobby_not_enough_money'));
        try {
            const roomId = await fbManager.createRoom(
                user,
                createConfig.bet,
                createConfig.ruleSet,
                createConfig.isPrivate,
                createConfig.isStrict,
                createConfig.isSuddenDeath,
                createConfig.players,
                createConfig.speed
            );
            setShowCreateModal(false);
            router.push(`/game/${roomId}`);
        } catch (e: any) { showAlert(`${t('lobby_create_error')} ${e.message}`); }
    };

    useEffect(() => {
        const unsub = fbManager.subscribeToPublicRooms(setRooms);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!user.activeRooms?.length) { setActiveRooms([]); return; }
        const unsub = fbManager.subscribeToRoomsByIds(user.activeRooms, setActiveRooms);
        return () => unsub();
    }, [user.activeRooms]);

    const handleJoinPrivate = async () => {
        if (!privateCode.trim()) return;
        const roomId = await fbManager.findPrivateRoom(privateCode);
        if (roomId) router.push(`/game/${roomId}`);
        else showAlert(t('lobby_room_not_found'));
    };

    const handleSurrenderActive = (roomId: string) => {
        showConfirm(t('lobby_surrender_confirm'), async () => {
            setIsSurrendering(true);
            try {
                await fbManager.leaveRoom(roomId, 'surrender');
            } catch (e: any) {
                showAlert(`${t('lobby_error')} ${e.message}`);
            } finally {
                setIsSurrendering(false);
            }
        });
    };

    const requireIncognitoCheck = (action: () => void) => {
        if (user.gender === 'female' && !user.settings?.isIncognito) {
            showConfirm(t('incognito_warn'), action);
        } else {
            action();
        }
    };

    return (
        // 🟢 Добавлено w-full и overflow-x-hidden для страховки от любых вылезаний
        <div className="p-4 md:p-6 w-full max-w-4xl mx-auto relative overflow-x-hidden">
            
            {/* 🟢 ШАПКА: На мобилках кнопка падает вниз и растягивается на всю ширину */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 mt-4 gap-4">
                <h1 className="text-3xl font-black text-center sm:text-left">{t('lobby_title')}</h1>
                <button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto bg-theme-primary hover:opacity-80 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-opacity">
                    + {t('lobby_create')}
                </button>
            </div>

            {/* 🟢 АКТИВНЫЕ ИГРЫ */}
            {activeRooms.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-black mb-4 text-theme-primary flex items-center gap-2"><span>⏳</span> {t('lobby_active_games')}</h2>
                    <div className="grid gap-4 w-full">
                        {activeRooms.map(room => (
                            <div key={room.id} className="bg-theme-panel p-4 rounded-2xl border-4 border-theme-primary flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 hover:shadow-md transition-shadow">
                                <div className="flex-1 text-center sm:text-left">
                                    <div className="font-bold text-lg text-theme-primary">{t('lobby_your_table')} ({room.betAmount} 💰)</div>
                                    <div className="text-xs opacity-70 font-medium mt-1">
                                        {room.status === 'paused' ? t('status_paused') :
                                            room.status === 'pause_requested' ? t('status_pause_req') :
                                                room.status === 'finished' ? t('status_finished') : t('status_playing')}
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button onClick={() => handleSurrenderActive(room.id!)} disabled={isSurrendering} className="flex-1 sm:flex-none bg-red-500/20 text-red-500 px-3 py-3 sm:py-2 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-colors">
                                        {room.status === 'finished' || room.status === 'waiting' ? t('btn_leave') : t('btn_surrender')}
                                    </button>
                                    <button onClick={() => router.push(`/game/${room.id}`)} className="flex-1 sm:flex-none bg-theme-primary text-white px-4 py-3 sm:py-2 rounded-lg font-bold hover:opacity-80 transition-opacity">
                                        {t('btn_enter')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 🟢 ПРИВАТНЫЙ КОД: Поле и кнопка друг под другом на мобилках */}
            <div className="bg-theme-panel p-4 rounded-2xl border-4 border-theme-border mb-8 flex flex-col sm:flex-row gap-3 shadow-sm w-full">
                <input type="text" placeholder={t('lobby_game_code')} value={privateCode} onChange={e => setPrivateCode(e.target.value.toUpperCase())} className="w-full sm:flex-1 bg-theme-main border-2 border-theme-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary uppercase font-mono tracking-widest font-bold" />
                <button onClick={() => requireIncognitoCheck(handleJoinPrivate)} className="w-full sm:w-auto bg-theme-primary hover:opacity-80 text-white px-8 py-3 font-bold rounded-xl transition-opacity">
                    {t('btn_enter')}
                </button>
            </div>

            <h2 className="text-xl font-black mb-4 opacity-80">{t('lobby_open_tables')}</h2>
            
            {/* 🟢 ОТКРЫТЫЕ СТОЛЫ */}
            <div className="grid gap-4 w-full pb-6">
                {rooms.length === 0 ? (
                    <div className="text-center py-10 opacity-50 border-4 border-dashed border-theme-border rounded-3xl font-bold">{t('lobby_no_active')}</div>
                ) : (
                    rooms.map(room => (
                        <div key={room.id} className="bg-theme-panel p-4 rounded-2xl border-4 border-theme-border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 hover:shadow-md transition-shadow">
                            
                            <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                                <div className="text-3xl shrink-0 pt-1 sm:pt-0">😎</div>
                                <div className="min-w-0">
                                    <div className="font-bold text-lg truncate w-full">{room.players[0]?.name || t('lobby_empty_table')}</div>
                                    <div className="text-xs opacity-70 font-medium flex flex-wrap gap-1 mt-1">
                                        <span className="bg-theme-main px-2 py-0.5 rounded-md border border-theme-border">
                                            {room.ruleSet === 'classic' ? t('rule_classic') : t('rule_local')}
                                        </span>
                                        {room.isStrict && <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md font-black">{t('rule_strict')}</span>}
                                        {room.isSuddenDeath && <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md font-black" title={t('rule_sudden_death')}>⚡</span>}
                                        <span className="text-theme-primary font-black ml-1 pt-0.5">({room.players.length}/{room.maxPlayers} {t('lobby_seats')})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Разделитель на мобилках */}
                            <div className="h-px w-full bg-theme-border/50 block sm:hidden my-1"></div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                <div className="text-amber-500 font-black text-xl whitespace-nowrap">{room.betAmount} 💰</div>
                                <button onClick={() => requireIncognitoCheck(() => router.push(`/game/${room.id}`))} className="flex-1 sm:flex-none bg-theme-primary text-white px-6 py-3 sm:py-2 rounded-xl sm:rounded-lg font-bold hover:opacity-80 transition-opacity">
                                    {t('btn_play')}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* МОДАЛКА (Без изменений, она уже была достаточно адаптивной, я только подправил паддинги) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-theme-panel p-5 sm:p-8 rounded-[2rem] shadow-2xl border-4 border-theme-border w-full max-w-lg max-h-[95vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl sm:text-3xl font-black text-theme-text">{t('modal_setup_title')}</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-2xl opacity-50 hover:opacity-100 transition p-2">✖</button>
                        </div>

                        <div className="mb-6">
                            <label className="block font-bold text-theme-primary mb-3 uppercase tracking-wider text-sm">{t('modal_bet_label')}</label>
                            <div className="flex flex-wrap gap-2">
                                {GAME_CONFIG.BET_OPTIONS.map(b => (
                                    <button
                                        key={b}
                                        onClick={() => setCreateConfig({ ...createConfig, bet: b })}
                                        className={`flex-1 min-w-[70px] py-2 px-1 rounded-xl font-black border-2 transition-all ${createConfig.bet === b ? 'bg-amber-500 border-amber-400 text-white shadow-lg scale-105' : 'bg-theme-main border-theme-border text-theme-text opacity-70 hover:opacity-100'}`}
                                    >
                                        {b}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block font-bold text-theme-primary mb-3 uppercase tracking-wider text-sm">{t('modal_speed_label')}</label>
                            <div className="flex gap-2 sm:gap-3">
                                {GAME_CONFIG.SPEED_OPTIONS.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => setCreateConfig({ ...createConfig, speed: s.value })}
                                        className={`flex-1 p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center border-4 transition-all ${createConfig.speed === s.value ? 'bg-theme-primary/20 border-theme-primary text-theme-text scale-105 shadow-md' : 'bg-theme-main border-transparent text-theme-text opacity-50 hover:opacity-100 border-theme-border'}`}
                                    >
                                        <span className="text-2xl sm:text-3xl mb-1">{s.icon}</span>
                                        <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">{t(s.labelKey)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                            <div className="bg-theme-main p-3 sm:p-4 rounded-2xl border-2 border-theme-border flex flex-col justify-center items-center gap-2 cursor-pointer transition hover:border-theme-primary" onClick={() => setCreateConfig({ ...createConfig, players: createConfig.players === 2 ? 4 : 2 })}>
                                <div className="text-2xl">{createConfig.players === 2 ? '👥' : '👨‍👩‍👧‍👦'}</div>
                                <div className="font-bold text-xs sm:text-sm text-theme-text">{createConfig.players} {t('modal_players_count')}</div>
                            </div>
                            <div className="bg-theme-main p-3 sm:p-4 rounded-2xl border-2 border-theme-border flex flex-col justify-center items-center gap-2 cursor-pointer transition hover:border-theme-primary" 
                                onClick={() => {
                                    const newRule = createConfig.ruleSet === 'local' ? 'classic' : 'local';
                                    setCreateConfig({ 
                                        ...createConfig, 
                                        ruleSet: newRule,
                                        isSuddenDeath: newRule === 'classic' ? false : createConfig.isSuddenDeath
                                    });
                                }}
                            >
                                <div className="text-2xl">{createConfig.ruleSet === 'local' ? '🏡' : '🏛️'}</div>
                                <div className="font-bold text-xs sm:text-sm text-theme-text">{createConfig.ruleSet === 'local' ? t('rule_local') : t('rule_classic')}</div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 mb-8 bg-theme-main p-4 rounded-2xl border-2 border-theme-border">
                            <label className="flex justify-between items-center cursor-pointer group">
                                <span className="font-bold text-theme-text group-hover:text-red-400 transition text-sm sm:text-base">⚖️ {t('modal_strict_mode')}</span>
                                <input type="checkbox" className="w-5 h-5 accent-red-500 rounded" checked={createConfig.isStrict} onChange={e => setCreateConfig({ ...createConfig, isStrict: e.target.checked })} />
                            </label>
                            
                            {createConfig.ruleSet === 'local' && (
                                <>
                                    <div className="h-px w-full bg-theme-border/50"></div>
                                    <label className="flex justify-between items-center cursor-pointer group">
                                        <span className="font-bold text-theme-text group-hover:text-amber-500 transition text-sm sm:text-base">⚡ {t('modal_sudden_death')}</span>
                                        <input type="checkbox" className="w-5 h-5 accent-amber-500 rounded" checked={createConfig.isSuddenDeath} onChange={e => setCreateConfig({ ...createConfig, isSuddenDeath: e.target.checked })} />
                                    </label>
                                </>
                            )}
                            
                            <div className="h-px w-full bg-theme-border/50"></div>
                            <label className="flex justify-between items-center cursor-pointer group">
                                <span className="font-bold text-theme-text group-hover:text-theme-primary transition text-sm sm:text-base">🔒 {t('modal_private_table')}</span>
                                <input type="checkbox" className="w-5 h-5 accent-theme-primary rounded" checked={createConfig.isPrivate} onChange={e => setCreateConfig({ ...createConfig, isPrivate: e.target.checked })} />
                            </label>
                        </div>

                        <button onClick={() => requireIncognitoCheck(handleCreateRoomSubmit)} className="w-full bg-theme-primary hover:bg-opacity-80 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:-translate-y-1">
                            🚀 {t('modal_btn_submit')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}