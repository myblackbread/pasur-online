import { useState, useEffect } from 'react';
import { realtimeApi } from '@/lib/supabase';
import { GameRoom, UserProfile } from '@/types';

export function useLobbyData(user: UserProfile) {
    const [rooms, setRooms] = useState<GameRoom[]>([]);
    const [activeRooms, setActiveRooms] = useState<GameRoom[]>([]);

    // Подписка на публичные столы
    useEffect(() => {
        const unsub = realtimeApi.subscribeToPublicRooms(setRooms);
        return () => unsub();
    }, []);

    // Подписка на МОИ активные столы
    useEffect(() => {
        if (!user.activeRooms?.length) {
            setActiveRooms([]);
            return;
        }
        const unsub = realtimeApi.subscribeToRoomsByIds(user.activeRooms, setActiveRooms);
        return () => unsub();
    }, [user.activeRooms]);

    // Исключаем из общих столов те, в которых мы уже сидим
    const openRooms = rooms.filter(r => !activeRooms.some(ar => ar.id === r.id));
    
    return {
        rooms,
        activeRooms,
        openRooms
    };
}