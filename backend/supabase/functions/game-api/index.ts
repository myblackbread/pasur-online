import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "@supabase/functions-js/edge-runtime.d.ts";

import { secureCreateRoom, devAddMoney } from "./api/roomCreation.ts";
import { secureJoinRoom, secureToggleReady, secureResolveReadyTimeout, secureRematch } from "./api/roomLobby.ts";
import { secureProposePause, secureAnswerPauseRequest, secureResolvePauseTimeout, securePlayCard, secureLeaveRoom, secureNextRound, secureGetMyMask, secureSendReaction } from "./api/roomGameplay.ts";
import { adminDeleteUser } from "./api/admin.ts";
import { runGlobalCleanup } from "./api/cron.ts";
import { GameError, ErrorCode } from "./errors.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Роутер
const apiRoutes: Record<string, Function> = {
    devAddMoney, secureCreateRoom, secureJoinRoom, secureToggleReady,
    secureResolveReadyTimeout, secureProposePause, secureAnswerPauseRequest,
    secureResolvePauseTimeout, securePlayCard, secureLeaveRoom, secureNextRound,
    secureGetMyMask, secureSendReaction, secureRematch, adminDeleteUser, 
    runGlobalCleanup // 🟢 РЕГИСТРИРУЕМ В РОУТЕРЕ
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { action, data } = await req.json();
        const authHeader = req.headers.get('Authorization');
        
        if (!authHeader) throw new GameError(ErrorCode.UNAUTHORIZED); // 🟢 ИСПОЛЬЗУЕМ GAME ERROR

        const token = authHeader.replace('Bearer ', '').trim();
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!apiRoutes[action]) {
            throw new Error(`Неизвестное действие: ${action}`); // Это системная ошибка, оставляем обычный Error
        }

        const adminDb = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey
        );

        let result;

        if (action === 'runGlobalCleanup') {
            if (token !== serviceRoleKey) {
                throw new GameError(ErrorCode.UNAUTHORIZED);
            }
            result = await apiRoutes[action](adminDb);
        } 
        else {
            const supabaseAuthClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? ''
            );

            const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);
            if (authError || !user) throw new GameError(ErrorCode.UNAUTHORIZED, authError?.message);

            result = await apiRoutes[action](data, user, adminDb);
        }

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        
    } catch (err: any) {
        if (err instanceof GameError) {
            // Если это наша игровая ошибка, отдаем ее код на фронт (например: "ERR_NOT_ENOUGH_MONEY")
            return new Response(JSON.stringify({ error: err.code }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
        
        // Если база упала или код сломался - логируем детали в Supabase Dashboard, а юзеру отдаем заглушку
        console.error("🔥 Системная ошибка:", err);
        return new Response(JSON.stringify({ error: ErrorCode.INTERNAL_SERVER_ERROR }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
});