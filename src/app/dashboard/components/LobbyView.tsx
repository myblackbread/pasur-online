import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fbManager } from '@/src/lib/supabaseManager';
import { supabase } from '@/src/lib/supabase'; // 🟢 ДОБАВЛЯЕМ SUPABASE
import { GameRoom, UserProfile, RuleSet } from '@/src/types';
import { useAlert } from '@/src/components/AlertProvider';

export default function LobbyView({ user }: { user: UserProfile }) {
    const router = useRouter();
    const { showAlert, showConfirm } = useAlert();
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
        else showAlert("Стол не найден или игра уже началась");
    };

    const handleCreateRoom = async (bet: number, rules: RuleSet) => {
        if (user.balance < bet) return showAlert("Недостаточно средств!");
        try {
            const roomId = await fbManager.createRoom(user, bet, rules, isCreatingPrivate, isStrict); // 🟢 ПЕРЕДАЕМ isStrict
            setShowCreateModal(false);
            router.push(`/game/${roomId}`);
        } catch (e: any) { showAlert("Ошибка создания стола: " + (e.message || "Неизвестная ошибка")); }
    };

    const handleSurrenderActive = (roomId: string) => {
        showConfirm("Точно сдаться? Вы потеряете ставку!", async () => {
            setIsSurrendering(true);
            try {
                // 🟢 ВЫЗОВ SUPABASE EDGE FUNCTION
                const { error } = await supabase.functions.invoke('game-api', {
                    body: { action: 'secureLeaveRoom', data: { roomId, reason: 'surrender' } }
                });
                if (error) throw error;
            } catch (e: any) {
                showAlert("Ошибка: " + e.message);
            } finally {
                setIsSurrendering(false);
            }
        });
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto relative">
            <div className="flex justify-between items-center mb-6 mt-4">
                <h1 className="text-3xl font-black">Игровой зал</h1>
                <button onClick={() => setShowCreateModal(true)} className="bg-theme-primary hover:opacity-80 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-opacity">
                    + Создать стол
                </button>
            </div>

            {activeRooms.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-black mb-4 text-theme-primary flex items-center gap-2"><span>⏳</span> Активные игры</h2>
                    <div className="grid gap-4">
                        {activeRooms.map(room => (
                            <div key={room.id} className="bg-theme-panel p-4 rounded-2xl border-4 border-theme-primary flex justify-between items-center hover:shadow-md transition-shadow">
                                <div>
                                    <div className="font-bold text-lg text-theme-primary">Ваш стол ({room.betAmount} 💰)</div>
                                    <div className="text-xs opacity-70 font-medium">
                                        {room.status === 'paused' ? 'На паузе' :
                                            room.status === 'pause_requested' ? 'Запрос паузы' :
                                                room.status === 'finished' ? 'Матч окончен' : 'Игра идет / Ожидание'}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleSurrenderActive(room.id!)} disabled={isSurrendering} className="bg-red-500/20 text-red-500 px-3 py-2 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-colors">
                                        {room.status === 'finished' || room.status === 'waiting' ? 'Выйти' : 'Сдаться'}
                                    </button>
                                    <button onClick={() => router.push(`/game/${room.id}`)} className="bg-theme-primary text-white px-4 py-2 rounded-lg font-bold hover:opacity-80 transition-opacity">Войти</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-theme-panel p-4 rounded-2xl border-4 border-theme-border mb-8 flex gap-2 shadow-sm">
                <input type="text" placeholder="КОД ИГРЫ" value={privateCode} onChange={e => setPrivateCode(e.target.value.toUpperCase())} className="flex-1 bg-theme-main border-2 border-theme-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-theme-primary uppercase font-mono tracking-widest font-bold" />
                <button onClick={handleJoinPrivate} className="bg-theme-primary hover:opacity-80 text-white px-6 font-bold rounded-xl transition-opacity">Войти</button>
            </div>

            <h2 className="text-xl font-black mb-4 opacity-80">Открытые столы</h2>
            <div className="grid gap-4">
                {rooms.length === 0 ? (
                    <div className="text-center py-10 opacity-50 border-4 border-dashed border-theme-border rounded-3xl font-bold">Нет активных столов</div>
                ) : (
                    rooms.map(room => (
                        <div key={room.id} className="bg-theme-panel p-4 rounded-2xl border-4 border-theme-border flex justify-between items-center hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">😎</div>
                                <div>
                                    <div className="font-bold text-lg">{room.players[0]?.name || "Пустой стол"}</div>
                                    <div className="text-xs opacity-70 font-medium">
                                        {room.ruleSet === 'classic' ? 'Классика' : 'Локальные'}
                                        {room.isStrict && <span className="ml-2 text-red-500 font-black">СТРОГИЙ</span>}
                                        <span className="ml-2 text-theme-primary font-black">({room.players.length}/{room.maxPlayers} мест)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-amber-500 font-black text-xl">{room.betAmount} 💰</div>
                                <button onClick={() => router.push(`/game/${room.id}`)} className="bg-theme-primary text-white px-4 py-2 rounded-lg font-bold hover:opacity-80 transition-opacity">Играть</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-theme-panel p-8 rounded-3xl shadow-2xl border-4 border-theme-border w-full max-w-sm">
                        <h2 className="text-2xl font-black mb-6 text-center">Создать стол</h2>
                        <div className="flex flex-col gap-2 mb-6 bg-theme-main p-3 rounded-xl border-2 border-theme-border">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="privateMode" checked={isCreatingPrivate} onChange={(e) => setIsCreatingPrivate(e.target.checked)} className="w-5 h-5 accent-theme-primary rounded" />
                                <label htmlFor="privateMode" className="font-bold cursor-pointer select-none">Приватный стол</label>
                            </div>
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t-2 border-theme-border/50">
                                <input type="checkbox" id="strictMode" checked={isStrict} onChange={(e) => setIsStrict(e.target.checked)} className="w-5 h-5 accent-red-500 rounded" />
                                <label htmlFor="strictMode" className="font-bold cursor-pointer select-none text-red-400">Строгий режим</label>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 mb-6">
                            <button onClick={() => handleCreateRoom(100, 'local')} className="w-full bg-theme-main border-2 border-theme-border hover:bg-theme-border hover:text-white py-4 rounded-xl font-bold flex justify-between px-4 transition-colors">
                                <span>Локальные</span><span className="text-amber-500 font-black">100 💰</span>
                            </button>
                            <button onClick={() => handleCreateRoom(500, 'classic')} className="w-full bg-theme-main border-2 border-theme-border hover:bg-theme-border hover:text-white py-4 rounded-xl font-bold flex justify-between px-4 transition-colors">
                                <span>Классика</span><span className="text-amber-500 font-black">500 💰</span>
                            </button>
                        </div>
                        <button onClick={() => setShowCreateModal(false)} className="w-full py-3 rounded-xl opacity-50 hover:opacity-100 transition-opacity font-bold">Отмена</button>
                    </div>
                </div>
            )}
        </div>
    );
}