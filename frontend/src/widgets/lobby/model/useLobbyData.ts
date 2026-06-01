import React from 'react';
import { GameRoom, roomRealtimeApi } from '@/entities/room';
import { UserProfile } from '@/entities/user';

export function useLobbyData(user: UserProfile) {
    const [rooms, setRooms] = React.useState<GameRoom[]>([]);
    const [activeRooms, setActiveRooms] = React.useState<GameRoom[]>([]);

    // Подписка на публичные столы
    React.useEffect(() => {
        const unsub = roomRealtimeApi.subscribeToPublicRooms(setRooms);
        return () => unsub();
    }, []);

    // Подписка на МОИ активные столы
    React.useEffect(() => {
        if (!user.activeRooms?.length) {
            setActiveRooms([]);
            return;
        }
        const unsub = roomRealtimeApi.subscribeToRoomsByIds(user.activeRooms, setActiveRooms);
        return () => unsub();
    }, [user.activeRooms]);

    // Исключаем из общих столов те, в которых мы уже сидим
    const activeIds = new Set(activeRooms.map(ar => ar.id));
    const openRooms = rooms.filter(r => !activeIds.has(r.id));

    return {
        rooms,
        activeRooms,
        openRooms
    };
}