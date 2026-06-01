import { createClient } from "@supabase/supabase-js";

// Импортируем наши новые, строго типизированные экшены
import { createRoomAction, joinRoomAction, toggleReadyAction, searchRoomsAction, devAddMoneyAction, rematchAction, resolveReadyTimeoutAction } from "./actions/lobby.action.ts";
import { playCardAction, leaveRoomAction, reportAfkAction, getMyMaskAction, sendReactionAction } from "./actions/gameplay.action.ts";
import { adminDeleteUserAction, runGlobalCleanupAction } from "./actions/admin.action.ts";

import { GameError, ErrorCode } from "./utils/errors.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractToken(req: Request): string {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new GameError(ErrorCode.UNAUTHORIZED);
    return authHeader.replace('Bearer ', '').trim();
}

Deno.serve(async (req) => {
    // Обработка CORS preflight-запросов
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    let action = 'unknown'; // <-- ВЫНЕСЛИ ПЕРЕМЕННУЮ СЮДА

    try {
        const token = extractToken(req);
        
        const body = await req.json();
        action = body.action as string; // <-- ПЕРЕОПРЕДЕЛЯЕМ ЗДЕСЬ
        const data = body.data || {};

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const adminDb = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey
        );

        let result;

        // ==========================================
        // 🤖 CRON & SYSTEM ACTIONS (Без юзера)
        // ==========================================
        if (action === 'runGlobalCleanup') {
            if (token !== serviceRoleKey) throw new GameError(ErrorCode.UNAUTHORIZED);
            result = await runGlobalCleanupAction({ db: adminDb });
            return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // ==========================================
        // 👤 USER ACTIONS (Требуют валидного юзера)
        // ==========================================
        const supabaseAuthClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );

        const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);
        if (authError || !user) throw new GameError(ErrorCode.UNAUTHORIZED);

        const userId = user.id;

        // Маршрутизация с жесткой типизацией на границе
        switch (action) {
            // --- ЛОББИ И ПОДГОТОВКА ---
            case 'devAddMoney':
                result = await devAddMoneyAction({ db: adminDb, userId });
                break;
            case 'secureCreateRoom':
                result = await createRoomAction({ db: adminDb, userId, payload: data });
                break;
            case 'secureJoinRoom':
                result = await joinRoomAction({ db: adminDb, userId, roomId: data.roomId, joinCode: data.joinCode });
                break;
            case 'secureToggleReady':
                result = await toggleReadyAction({ db: adminDb, userId, roomId: data.roomId, isReady: data.isReady });
                break;
            case 'secureSearchRooms':
                result = await searchRoomsAction({ db: adminDb, filters: data });
                break;
            case 'secureRematch':
                result = await rematchAction({ db: adminDb, userId, roomId: data.roomId });
                break;
            case 'secureResolveReadyTimeout':
                result = await resolveReadyTimeoutAction({ db: adminDb, userId, roomId: data.roomId });
                break;

            // --- ГЕЙМПЛЕЙ ---
            case 'securePlayCard':
                result = await playCardAction({ db: adminDb, userId, roomId: data.roomId, cardId: data.cardId, targetCardIds: data.targetCardIds || [] });
                break;
            case 'secureLeaveRoom':
                result = await leaveRoomAction({ db: adminDb, userId, roomId: data.roomId });
                break;
            case 'reportAfk': 
                result = await reportAfkAction({ db: adminDb, userId, roomId: data.roomId });
                break;
            case 'secureGetMyMask':
                result = await getMyMaskAction({ db: adminDb, userId, roomId: data.roomId });
                break;
            case 'secureSendReaction':
                result = await sendReactionAction({ db: adminDb, userId, roomId: data.roomId });
                break;
                
            // --- АДМИНКА ---
            case 'adminDeleteUser':
                result = await adminDeleteUserAction({ db: adminDb, userId, uidToKill: data.uidToKill });
                break;

            default:
                throw new GameError(ErrorCode.UNSUPPORTED_ACTION);
        }

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } catch (err: any) {
        if (err instanceof GameError) {
            return new Response(
                JSON.stringify({ error: err.code, message: err.message }), 
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // Теперь action доступен здесь
        console.error(`[System] Unhandled exception in action '${action}':`, err);
        return new Response(
            JSON.stringify({ error: ErrorCode.INTERNAL_SERVER_ERROR }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});