import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, realtimeApi, gameApi } from '@/lib/supabase';
import { GameRoom, UserProfile } from '@/types';
import { useTranslation } from 'react-i18next';
import { useAlert } from '@/components/providers/AlertProvider';

export function useGameRoom(roomId: string) {
    const router = useRouter();
    const { showAlert } = useAlert();
    const { t } = useTranslation();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [roomData, setRoomData] = useState<GameRoom | null>(null);
    const [allActiveRooms, setAllActiveRooms] = useState<GameRoom[]>([]);
    const [myMask, setMyMask] = useState<string | null>(null);

    const shownAlerts = useRef<Set<string>>(new Set());
    const hasAttemptedFetchMask = useRef(false);

    // 🟢 Рефы для доступа к актуальному состоянию в момент размонтирования компонента
    const currentStatusRef = useRef(roomData?.status);
    const myMaskRef = useRef(myMask);

    useEffect(() => {
        currentStatusRef.current = roomData?.status;
        myMaskRef.current = myMask;
    }, [roomData?.status, myMask]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedAlerts = sessionStorage.getItem(`pasur_alerts_${roomId}`);
            if (savedAlerts) {
                try { shownAlerts.current = new Set(JSON.parse(savedAlerts)); } catch (e) { }
            }
            setMyMask(sessionStorage.getItem(`pasur_mask_${roomId}`));
        }
    }, [roomId]);

    useEffect(() => {
        let unsubUser: (() => void) | undefined;

        const setupUser = (currentUser: any) => {
            if (currentUser) {
                if (!unsubUser) {
                    unsubUser = realtimeApi.subscribeToUser(currentUser.id, (userData) => {
                        if (userData) setUser(userData);
                    });
                }
            } else {
                if (unsubUser) unsubUser();
                router.push('/');
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setupUser(session?.user);
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            setupUser(session?.user);
        });

        return () => { subscription.unsubscribe(); if (unsubUser) unsubUser(); };
    }, [router]);

    useEffect(() => {
        if (!user) return;
        const roomsToFetch = Array.from(new Set([roomId, ...(user.activeRooms || [])]));
        const unsubRoom = realtimeApi.subscribeToRoomsByIds(roomsToFetch, (rooms) => {
            setAllActiveRooms(rooms);
            const data = rooms.find(r => r.id === roomId);
            if (!data) { router.push('/dashboard'); return; }

            const currentMask = sessionStorage.getItem(`pasur_mask_${roomId}`);
            const amIInPlayers = data.players.some(p => p.id === currentMask);

            if (!amIInPlayers && data.status === 'waiting' && currentMask) {
                sessionStorage.removeItem(`pasur_mask_${roomId}`);
                setMyMask(null);
            }

            setRoomData(data);

            if (data.adminMessage && !shownAlerts.current.has(data.adminMessage)) {
                shownAlerts.current.add(data.adminMessage);
                if (typeof window !== 'undefined') sessionStorage.setItem(`pasur_alerts_${roomId}`, JSON.stringify(Array.from(shownAlerts.current)));
                const parts = data.adminMessage.split('|');
                if (parts.length >= 3) {
                    if (parts[0] === 'ALL' || parts[0] === currentMask) showAlert(t(parts[1]));
                } else {
                    showAlert(t(data.adminMessage.split('|')[0]));
                }
            }
        });
        return () => unsubRoom();
    }, [user?.activeRooms, roomId, router, showAlert, t]);

    useEffect(() => {
        if (!myMask && user && roomData && !hasAttemptedFetchMask.current) {
            hasAttemptedFetchMask.current = true;
            gameApi.getMyMask(roomId).then(mask => {
                if (mask) { setMyMask(mask); sessionStorage.setItem(`pasur_mask_${roomId}`, mask); }
            }).catch(console.error);
        }
    }, [user, roomData, myMask, roomId]);

    // 🟢 МАГИЯ СВАЙПА НАЗАД: Выходим из-за стола при уходе со страницы, если игра не началась
    useEffect(() => {
        return () => {
            const status = currentStatusRef.current;
            const mask = myMaskRef.current;
            
            // Компонент умирает (свайп назад или закрытие). 
            // Если мы сидели за столом и игра не началась -> освобождаем место
            if (mask && (status === 'waiting' || status === 'ready_check')) {
                gameApi.leaveRoom(roomId, 'leave').catch(() => {});
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem(`pasur_mask_${roomId}`);
                }
            }
        };
    }, [roomId]);

    return { user, roomData, allActiveRooms, myMask, setMyMask };
}