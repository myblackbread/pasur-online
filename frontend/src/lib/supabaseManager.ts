import { supabase } from './supabase';
import { UserProfile, GameRoom, RuleSet, GAME_CONFIG } from '../types';

const mapUser = (data: any): UserProfile => ({
    uid: data.id,
    displayName: data.display_name,
    balance: data.balance,
    avatarEmoji: data.settings?.avatarEmoji || '😎',
    gender: data.settings?.gender,
    activeRooms: data.active_rooms || [],
    settings: data.settings || { isIncognito: false, blockedUids: [] },
    createdAt: data.created_at || Date.now(),
    lastActive: data.last_active || Date.now()
});

const mapRoom = (data: any): GameRoom => ({
    id: data.id,
    status: data.status,
    maxPlayers: data.max_players,
    betAmount: data.bet_amount,
    ruleSet: data.rule_set,
    isStrict: data.is_strict ?? true,
    isSuddenDeath: data.is_sudden_death ?? false, // 🟢 Добавлено
    turnDuration: data.turn_duration || GAME_CONFIG.DEFAULT_TURN_DURATION,
    isPrivate: data.is_private,
    joinCode: data.join_code,
    players: data.players || [],
    gameState: data.game_state,
    turnDeadline: data.turn_deadline,
    readyDeadline: data.ready_deadline,
    pauseProposals: data.pause_proposals || [],
    adminMessage: data.admin_message,
    createdAt: data.created_at
});

class SupabaseManager {

    private async callApi(action: string, data: any = {}) {
        const { data: result, error } = await supabase.functions.invoke('game-api', {
            body: { action, data }
        });

        if (error) throw new Error("err_network");
        if (result?.error) {
            throw new Error(result.error);
        }
        return result;
    }

    /* ================= AUTH ================= */

    async login(provider: 'google' | 'email' | 'guest', email?: string, password?: string, gender?: 'male' | 'female'): Promise<string> {
        let authResult;

        if (provider === 'google') {
            authResult = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (authResult.error) throw authResult.error;
            return "";
        } else if (provider === 'guest') {
            authResult = await supabase.auth.signInAnonymously();
        } else if (provider === 'email' && email && password) {
            authResult = await supabase.auth.signInWithPassword({ email, password });
            if (authResult.error?.message.includes("Invalid login")) {
                authResult = await supabase.auth.signUp({ email, password });
            }
        } else {
            throw new Error("err_invalid_login_data");
        }

        if (authResult?.error) throw authResult.error;
        const user = authResult.data?.user;
        if (!user) throw new Error("err_auth_failed");

        const { data: userDoc } = await supabase.from('users').select('*').eq('id', user.id).single();

        if (!userDoc) {
            let displayName = user.user_metadata?.name || (email ? email.split('@')[0] : `Guest_${user.id.substring(0, 5)}`);
            await supabase.from('users').insert({
                id: user.id,
                display_name: displayName,
                balance: 1000,
                active_rooms: [],
                settings: {
                    isIncognito: gender === 'female',
                    blockedUids: [],
                    avatarEmoji: provider === 'guest' ? '👻' : '😎',
                    gender
                }
            });
        }
        return user.id;
    }

    async linkGoogleAccount(): Promise<void> {
        const { error } = await supabase.auth.linkIdentity({ provider: 'google' });
        if (error) throw new Error("err_google_already_linked");
    }

    /* ================= REALTIME ================= */

    subscribeToUser(uid: string, callback: (user: UserProfile | null) => void) {
        const fetchAndEnsureUser = async () => {
            const { data, error } = await supabase.from('users').select('*').eq('id', uid).single();

            if (error && error.code === 'PGRST116') {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                const newProfile = {
                    id: uid,
                    display_name: authUser?.user_metadata?.name || `Player_${uid.substring(0, 5)}`,
                    balance: 1000,
                    active_rooms: [],
                    settings: {
                        isIncognito: false,
                        blockedUids: [],
                        avatarEmoji: authUser?.is_anonymous ? '👻' : '😎',
                        gender: 'male'
                    }
                };

                const { error: insertErr } = await supabase.from('users').insert(newProfile);

                if (insertErr) {
                    if (insertErr.code === '23505') {
                        const { data: existingData } = await supabase.from('users').select('*').eq('id', uid).single();
                        if (existingData) callback(mapUser(existingData));
                        return;
                    }
                    console.error("🔥 Ошибка при создании профиля:", insertErr.message);
                    callback(null);
                    return;
                }

                callback(mapUser(newProfile));
                return;
            }

            if (data) callback(mapUser(data));
            else callback(null);
        };

        fetchAndEnsureUser();

        const channelName = `user_changes_${uid}_${Math.random().toString(36).substring(7)}`;
        const channel = supabase.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${uid}` }, (payload) => {
                callback(mapUser(payload.new));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }

    subscribeToPublicRooms(callback: (rooms: GameRoom[]) => void) {
        let currentRooms: GameRoom[] = [];

        const fetchRooms = async () => {
            const { data } = await supabase.from('rooms')
                .select('*').eq('status', 'waiting').eq('is_private', false)
                .order('created_at', { ascending: false });
            if (data) {
                currentRooms = data.map(mapRoom);
                callback([...currentRooms]);
            }
        };

        fetchRooms();

        const channel = supabase.channel(`public_rooms_${Math.random().toString(36).substring(7)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'is_private=eq.false' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    if (payload.new.status === 'waiting') {
                        currentRooms = [mapRoom(payload.new), ...currentRooms];
                    }
                } else if (payload.eventType === 'UPDATE') {
                    if (payload.new.status === 'waiting') {
                        // Если статус всё еще waiting - обновляем или добавляем
                        const index = currentRooms.findIndex(r => r.id === payload.new.id);
                        if (index !== -1) currentRooms[index] = mapRoom(payload.new);
                        else currentRooms.unshift(mapRoom(payload.new));
                    } else {
                        // 🟢 ЕСЛИ ИГРА СТАРТОВАЛА - УБИРАЕМ СТОЛ ИЗ ЛОББИ
                        currentRooms = currentRooms.filter(r => r.id !== payload.new.id);
                    }
                } else if (payload.eventType === 'DELETE') {
                    currentRooms = currentRooms.filter(r => r.id !== payload.old.id);
                }
                callback([...currentRooms]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }

    subscribeToRoomsByIds(roomIds: string[], callback: (rooms: GameRoom[]) => void) {
        if (!roomIds.length) { callback([]); return () => { }; }
        let currentRooms: GameRoom[] = [];

        const fetchRooms = async () => {
            const { data } = await supabase.from('rooms').select('*').in('id', roomIds);
            if (data) {
                currentRooms = data.map(mapRoom);
                callback([...currentRooms]);
            }
        };

        fetchRooms();

        const filterStr = `id=in.(${roomIds.join(',')})`;
        const channel = supabase.channel(`active_rooms_${roomIds.join('_').substring(0, 10)}_${Math.random().toString(36).substring(7)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: filterStr }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    currentRooms = currentRooms.map(r => r.id === payload.new.id ? mapRoom(payload.new) : r);
                } else if (payload.eventType === 'DELETE') {
                    currentRooms = currentRooms.filter(r => r.id !== payload.old.id);
                }
                callback([...currentRooms]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }

    /* ================= API ВЫЗОВЫ ================= */

    // 🟢 ИСПРАВЛЕНО: Добавлен аргумент isSuddenDeath и он передается в data API
    async createRoom(creator: UserProfile, bet: number, ruleSet: RuleSet, isPrivate: boolean, isStrict: boolean, isSuddenDeath: boolean, maxPlayers: number, turnDuration: number): Promise<string> {
        if (creator.balance < bet) throw new Error("ERR_NOT_ENOUGH_MONEY");
        const data = await this.callApi('secureCreateRoom', { betAmount: bet, ruleSet, isPrivate, isStrict, isSuddenDeath, maxPlayers, turnDuration });
        if (typeof window !== 'undefined') sessionStorage.setItem(`pasur_mask_${data.roomId}`, data.publicUid);
        return data.roomId;
    }

    async joinRoom(roomId: string): Promise<string> {
        const data = await this.callApi('secureJoinRoom', { roomId });
        if (typeof window !== 'undefined') sessionStorage.setItem(`pasur_mask_${roomId}`, data.publicUid);
        return data.publicUid;
    }

    async findPrivateRoom(code: string): Promise<string | null> {
        const { data } = await supabase.from('rooms').select('id').eq('join_code', code.toUpperCase()).eq('status', 'waiting').limit(1);
        return data && data.length > 0 ? data[0].id : null;
    }

    async updateUserEmoji(uid: string, emoji: string) {
        const { data } = await supabase.from('users').select('settings').eq('id', uid).single();
        if (data) {
            const newSettings = { ...data.settings, avatarEmoji: emoji };
            await supabase.from('users').update({ settings: newSettings }).eq('id', uid);
        }
    }

    async sendReaction(roomId: string, emoji: string): Promise<void> {
        await this.callApi('secureSendReaction', { roomId, emoji });
    }

    async addMoney(uid: string, amount: number): Promise<void> {
        await this.callApi('devAddMoney');
    }

    async toggleReady(roomId: string, isReady: boolean): Promise<void> {
        await this.callApi('secureToggleReady', { roomId, isReady });
    }

    async resolveReadyTimeout(roomId: string): Promise<void> {
        try { await this.callApi('secureResolveReadyTimeout', { roomId }); } catch (e) { /* Игнорируем */ }
    }

    async proposePause(roomId: string): Promise<void> {
        await this.callApi('secureProposePause', { roomId });
    }

    async answerPauseRequest(roomId: string, accept: boolean): Promise<void> {
        await this.callApi('secureAnswerPauseRequest', { roomId, accept });
    }

    async resolvePauseTimeout(roomId: string): Promise<void> {
        try { await this.callApi('secureResolvePauseTimeout', { roomId }); } catch (e) { }
    }

    async rematch(roomId: string): Promise<void> {
        await this.callApi('secureRematch', { roomId });
    }

    async leaveRoom(roomId: string, reason: 'leave' | 'surrender' | 'timeout'): Promise<void> {
        await this.callApi('secureLeaveRoom', { roomId, reason });
    }

    async nextRound(roomId: string): Promise<void> {
        await this.callApi('secureNextRound', { roomId });
    }

    async adminDeleteUser(uidToKill: string): Promise<void> {
        await this.callApi('adminDeleteUser', { uidToKill });
    }

    async getMyMask(roomId: string): Promise<string | null> {
        const data = await this.callApi('secureGetMyMask', { roomId });
        return data?.mask || null;
    }

    async playCard(roomId: string, cardId: string, targetCardIds: string[]): Promise<void> {
        await this.callApi('securePlayCard', { roomId, cardId, targetCardIds });
    }
}

export const fbManager = new SupabaseManager();