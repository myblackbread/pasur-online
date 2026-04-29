import { supabase } from './supabase';
import { UserProfile, GameRoom, RuleSet } from '../types';

// Адаптеры для преобразования snake_case (Postgres) в camelCase (Frontend)
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
    isStrict: data.is_strict ?? true, // 🟢 ДОБАВИТЬ ЭТУ СТРОКУ
    isPrivate: data.is_private,
    joinCode: data.join_code,
    players: data.players || [],
    gameState: data.game_state,
    turnDeadline: data.turn_deadline,
    pauseProposals: data.pause_proposals || [],
    adminMessage: data.admin_message,
    createdAt: data.created_at
});

class SupabaseManager {
    
    // Единый метод для вызова нашего бэкенда (Deno Edge Function)
    private async callApi(action: string, data: any = {}) {
        const { data: result, error } = await supabase.functions.invoke('game-api', {
            body: { action, data }
        });
        
        if (error) throw new Error("Ошибка сети: " + error.message);
        if (result?.error) throw new Error(result.error);
        return result;
    }

    /* ================= AUTH ================= */
    
    async login(provider: 'google' | 'email' | 'guest', email?: string, password?: string, gender?: 'male' | 'female'): Promise<string> {
        let authResult;

        if (provider === 'google') {
            authResult = await supabase.auth.signInWithOAuth({ provider: 'google' });
            if (authResult.error) throw authResult.error;
            return ""; // OAuth делает редирект, так что дальше код не пойдет
        } else if (provider === 'guest') {
            authResult = await supabase.auth.signInAnonymously();
        } else if (provider === 'email' && email && password) {
            authResult = await supabase.auth.signInWithPassword({ email, password });
            if (authResult.error?.message.includes("Invalid login")) {
                authResult = await supabase.auth.signUp({ email, password });
            }
        } else {
            throw new Error("Неверные данные для входа");
        }

        if (authResult?.error) throw authResult.error;
        const user = authResult.data?.user;
        if (!user) throw new Error("Ошибка авторизации");

        // Проверяем, есть ли юзер в таблице
        const { data: userDoc } = await supabase.from('users').select('*').eq('id', user.id).single();

        if (!userDoc) {
            let displayName = user.user_metadata?.name || (email ? email.split('@')[0] : `Гость_${user.id.substring(0, 5)}`);
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
        if (error) throw new Error("Этот аккаунт Google уже привязан.");
    }

    /* ================= REALTIME ПАПКА ================= */

    subscribeToUser(uid: string, callback: (user: UserProfile | null) => void) {
        const fetchAndEnsureUser = async () => {
            const { data, error } = await supabase.from('users').select('*').eq('id', uid).single();
            
            // Если профиль не найден, пробуем создать
            if (error && error.code === 'PGRST116') {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                
                const newProfile = {
                    id: uid,
                    display_name: authUser?.user_metadata?.name || `Игрок_${uid.substring(0, 5)}`,
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
                    // МАГИЯ ЗДЕСЬ: Если профиль уже создался в фоне, просто загружаем его
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
        let currentRooms: GameRoom[] = []; // Локальный кэш

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
                // ОБНОВЛЯЕМ ЛОКАЛЬНО БЕЗ ЗАПРОСОВ В БАЗУ
                if (payload.eventType === 'INSERT') {
                    currentRooms = [mapRoom(payload.new), ...currentRooms];
                } else if (payload.eventType === 'UPDATE') {
                    currentRooms = currentRooms.map(r => r.id === payload.new.id ? mapRoom(payload.new) : r);
                } else if (payload.eventType === 'DELETE') {
                    currentRooms = currentRooms.filter(r => r.id !== payload.old.id);
                }
                callback([...currentRooms]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }

    subscribeToRoomsByIds(roomIds: string[], callback: (rooms: GameRoom[]) => void) {
        if (!roomIds.length) { callback([]); return () => {}; }
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

    /* ================= API ВЫЗОВЫ (Edge Functions) ================= */

    async createRoom(creator: UserProfile, bet: number, ruleSet: RuleSet, isPrivate: boolean = false, isStrict: boolean = true): Promise<string> {
        if (creator.balance < bet) throw new Error("Недостаточно средств");
        const data = await this.callApi('secureCreateRoom', { betAmount: bet, ruleSet, isPrivate, isStrict });
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
}

export const fbManager = new SupabaseManager();