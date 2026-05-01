import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fbManager } from '@/lib/supabaseManager';
import { GameRoom, UserProfile, RuleSet } from '@/types';
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
    const [isCreatingPrivate, setIsCreatingPrivate] = useState(false);
    const [isStrict, setIsStrict] = useState(true);
    const [isSurrendering, setIsSurrendering] = useState(false);

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

    const handleCreateRoom = async (bet: number, rules: RuleSet) => {
        if (user.balance < bet) return showAlert(t('lobby_not_enough_money'));
        try {
            const roomId = await fbManager.createRoom(user, bet, rules, isCreatingPrivate, isStrict); // 🟢 ПЕРЕДАЕМ isStrict
            setShowCreateModal(false);
            router.push(`/game/${roomId}`);
        } catch (e: any) { showAlert(`${t('lobby_create_error')} ${e.message}`); }
    };

    const handleSurrenderActive = (roomId: string) => {
        showConfirm(t('lobby_surrender_confirm'), async () => {
            setIsSurrendering(true);
            try {
                // 🟢 ВЫЗОВ SUPABASE EDGE FUNCTION
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
                <button onClick={handleJoinPrivate} className="bg-theme-primary hover:opacity-80 text-white px-6 font-bold rounded-xl transition-opacity">Войти</button>
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
                                        <span className="ml-2 text-theme-primary font-black">({room.players.length}/{room.maxPlayers} {t('lobby_seats')})</span>                                    </div>
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
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-theme-panel p-8 rounded-3xl shadow-2xl border-4 border-theme-border w-full max-w-sm">
                        <h2 className="text-2xl font-black mb-6 text-center">{t('modal_create_title')}</h2>
                        <div className="flex flex-col gap-2 mb-6 bg-theme-main p-3 rounded-xl border-2 border-theme-border">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="privateMode" checked={isCreatingPrivate} onChange={(e) => setIsCreatingPrivate(e.target.checked)} className="w-5 h-5 accent-theme-primary rounded" />
                                <label htmlFor="privateMode" className="font-bold cursor-pointer select-none">{t('modal_private_table')}</label>
                            </div>
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t-2 border-theme-border/50">
                                <input type="checkbox" id="strictMode" checked={isStrict} onChange={(e) => setIsStrict(e.target.checked)} className="w-5 h-5 accent-red-500 rounded" />
                                <label htmlFor="strictMode" className="font-bold cursor-pointer select-none text-red-400">{t('modal_strict_mode')}</label>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 mb-6">
                            <button onClick={() => handleCreateRoom(100, 'local')} className="w-full bg-theme-main border-2 border-theme-border hover:bg-theme-border hover:text-white py-4 rounded-xl font-bold flex justify-between px-4 transition-colors">
                                <span>{t('rule_local')}</span><span className="text-amber-500 font-black">100 💰</span>
                            </button>
                            <button onClick={() => handleCreateRoom(500, 'classic')} className="w-full bg-theme-main border-2 border-theme-border hover:bg-theme-border hover:text-white py-4 rounded-xl font-bold flex justify-between px-4 transition-colors">
                                <span>{t('rule_classic')}</span><span className="text-amber-500 font-black">500 💰</span>
                            </button>
                        </div>
                        <button onClick={() => setShowCreateModal(false)} className="w-full py-3 rounded-xl opacity-50 hover:opacity-100 transition-opacity font-bold">{t('btn_cancel')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}