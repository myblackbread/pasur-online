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
        isSuddenDeath: false, // 🟢 ТЕПЕРЬ ТИП УКАЗАН
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

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto relative">
            <div className="flex justify-between items-center mb-6 mt-4">
                <h1 className="text-3xl font-black">{t('lobby_title')}</h1>
                <button onClick={() => setShowCreateModal(true)} className="bg-theme-primary hover:opacity-80 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-opacity">
                    + {t('lobby_create')}
                </button>
            </div>

            {activeRooms.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-black mb-4 text-theme-primary flex items-center gap-2"><span>⏳</span> {t('lobby_active_games')}</h2>
                    <div className="grid gap-4">
                        {activeRooms.map(room => (
                            <div key={room.id} className="bg-theme-panel p-4 rounded-2xl border-4 border-theme-primary flex justify-between items-center hover:shadow-md transition-shadow">
                                <div>
                                    <div className="font-bold text-lg text-theme-primary">{t('lobby_your_table')} ({room.betAmount} 💰)</div>
                                    <div className="text-xs opacity-70 font-medium">
                                        {room.status === 'paused' ? t('status_paused') :
                                            room.status === 'pause_requested' ? t('status_pause_req') :
                                                room.status === 'finished' ? t('status_finished') : t('status_playing')}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleSurrenderActive(room.id!)} disabled={isSurrendering} className="bg-red-500/20 text-red-500 px-3 py-2 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-colors">
                                        {room.status === 'finished' || room.status === 'waiting' ? t('btn_leave') : t('btn_surrender')}
                                    </button>
                                    <button onClick={() => router.push(`/game/${room.id}`)} className="bg-theme-primary text-white px-4 py-2 rounded-lg font-bold hover:opacity-80 transition-opacity">{t('btn_enter')}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-theme-panel p-4 rounded-2xl border-4 border-theme-border mb-8 flex gap-2 shadow-sm">
                <input type="text" placeholder={t('lobby_game_code')} value={privateCode} onChange={e => setPrivateCode(e.target.value.toUpperCase())} className="flex-1 bg-theme-main border-2 border-theme-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-theme-primary uppercase font-mono tracking-widest font-bold" />
                <button onClick={handleJoinPrivate} className="bg-theme-primary hover:opacity-80 text-white px-6 font-bold rounded-xl transition-opacity">{t('btn_enter')}</button>
            </div>

            <h2 className="text-xl font-black mb-4 opacity-80">{t('lobby_open_tables')}</h2>
            <div className="grid gap-4">
                {rooms.length === 0 ? (
                    <div className="text-center py-10 opacity-50 border-4 border-dashed border-theme-border rounded-3xl font-bold">{t('lobby_no_active')}</div>
                ) : (
                    rooms.map(room => (
                        <div key={room.id} className="bg-theme-panel p-4 rounded-2xl border-4 border-theme-border flex justify-between items-center hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">😎</div>
                                <div>
                                    <div className="font-bold text-lg">{room.players[0]?.name || t('lobby_empty_table')}</div>
                                    <div className="text-xs opacity-70 font-medium">
                                        {room.ruleSet === 'classic' ? t('rule_classic') : t('rule_local')}
                                        {room.isStrict && <span className="ml-2 text-red-500 font-black">{t('rule_strict')}</span>}
                                        {room.isSuddenDeath && <span className="ml-2 text-amber-500 font-black" title={t('rule_sudden_death')}>⚡</span>}
                                        <span className="ml-2 text-theme-primary font-black">({room.players.length}/{room.maxPlayers} {t('lobby_seats')})</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-amber-500 font-black text-xl">{room.betAmount} 💰</div>
                                <button onClick={() => router.push(`/game/${room.id}`)} className="bg-theme-primary text-white px-4 py-2 rounded-lg font-bold hover:opacity-80 transition-opacity">{t('btn_play')}</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
                    <div className="bg-theme-panel p-6 sm:p-8 rounded-[2rem] shadow-2xl border-4 border-theme-border w-full max-w-lg max-h-[95vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl sm:text-3xl font-black text-theme-text">{t('modal_setup_title')}</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-2xl opacity-50 hover:opacity-100 transition">✖</button>
                        </div>

                        {/* Выбор ставки (Сетка) */}
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

                        {/* Выбор времени на ход (Карточки) */}
                        <div className="mb-6">
                            <label className="block font-bold text-theme-primary mb-3 uppercase tracking-wider text-sm">{t('modal_speed_label')}</label>
                            <div className="flex gap-3">
                                {GAME_CONFIG.SPEED_OPTIONS.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => setCreateConfig({ ...createConfig, speed: s.value })}
                                        className={`flex-1 p-3 rounded-2xl flex flex-col items-center justify-center border-4 transition-all ${createConfig.speed === s.value ? 'bg-theme-primary/20 border-theme-primary text-theme-text scale-105 shadow-md' : 'bg-theme-main border-transparent text-theme-text opacity-50 hover:opacity-100 border-theme-border'}`}
                                    >
                                        <span className="text-3xl mb-1">{s.icon}</span>
                                        <span className="text-xs font-bold">{t(s.labelKey)}</span>
                                        <span className="text-[10px] opacity-70">{s.value / 1000} {t('speed_sec')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Настройки правил */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-theme-main p-4 rounded-2xl border-2 border-theme-border flex flex-col justify-center items-center gap-2 cursor-pointer transition hover:border-theme-primary" onClick={() => setCreateConfig({ ...createConfig, players: createConfig.players === 2 ? 4 : 2 })}>
                                <div className="text-2xl">{createConfig.players === 2 ? '👥' : '👨‍👩‍👧‍👦'}</div>
                                <div className="font-bold text-sm text-theme-text">{createConfig.players} {t('modal_players_count')}</div>
                            </div>
                            <div className="bg-theme-main p-4 rounded-2xl border-2 border-theme-border flex flex-col justify-center items-center gap-2 cursor-pointer transition hover:border-theme-primary" 
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
                                <div className="font-bold text-sm text-theme-text">{createConfig.ruleSet === 'local' ? t('rule_local') : t('rule_classic')}</div>
                            </div>
                        </div>

                        {/* Тумблеры */}
                        <div className="flex flex-col gap-3 mb-8 bg-theme-main p-4 rounded-2xl border-2 border-theme-border">
                            <label className="flex justify-between items-center cursor-pointer group">
                                <span className="font-bold text-theme-text group-hover:text-red-400 transition">⚖️ {t('modal_strict_mode')}</span>
                                <input type="checkbox" className="w-5 h-5 accent-red-500 rounded" checked={createConfig.isStrict} onChange={e => setCreateConfig({ ...createConfig, isStrict: e.target.checked })} />
                            </label>
                            
                            {createConfig.ruleSet === 'local' && (
                                <>
                                    <div className="h-px w-full bg-theme-border/50"></div>
                                    <label className="flex justify-between items-center cursor-pointer group">
                                        <span className="font-bold text-theme-text group-hover:text-amber-500 transition">⚡ {t('modal_sudden_death')}</span>
                                        <input type="checkbox" className="w-5 h-5 accent-amber-500 rounded" checked={createConfig.isSuddenDeath} onChange={e => setCreateConfig({ ...createConfig, isSuddenDeath: e.target.checked })} />
                                    </label>
                                </>
                            )}
                            
                            <div className="h-px w-full bg-theme-border/50"></div>
                            <label className="flex justify-between items-center cursor-pointer group">
                                <span className="font-bold text-theme-text group-hover:text-theme-primary transition">🔒 {t('modal_private_table')}</span>
                                <input type="checkbox" className="w-5 h-5 accent-theme-primary rounded" checked={createConfig.isPrivate} onChange={e => setCreateConfig({ ...createConfig, isPrivate: e.target.checked })} />
                            </label>
                        </div>

                        <button onClick={handleCreateRoomSubmit} className="w-full bg-theme-primary hover:bg-opacity-80 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl hover:-translate-y-1">
                            🚀 {t('modal_btn_submit')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}