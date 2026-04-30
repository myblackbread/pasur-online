import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "@supabase/functions-js/edge-runtime.d.ts";

import { secureCreateRoom, devAddMoney } from "./api/roomCreation.ts";
import { secureJoinRoom, secureToggleReady, secureResolveReadyTimeout, secureRematch } from "./api/roomLobby.ts";
import { secureProposePause, secureAnswerPauseRequest, secureResolvePauseTimeout, securePlayCard, secureLeaveRoom, secureNextRound, secureGetMyMask, secureSendReaction } from "./api/roomGameplay.ts";
import { adminDeleteUser } from "./api/admin.ts";
import { runGlobalCleanup } from "./api/cron.ts"; // 🟢 ИМПОРТ НАШЕГО УБОРЩИКА

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
        
        if (!authHeader) throw new Error("Требуется авторизация");

        const token = authHeader.replace('Bearer ', '').trim();
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!apiRoutes[action]) {
            throw new Error(`Неизвестное действие: ${action}`);
        }

        const adminDb = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey
        );

        let result;

        // 🟢 СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ СЕРВЕРНЫХ ЗАДАЧ (CRON)
        if (action === 'runGlobalCleanup') {
            // Проверяем, что запрос сделал сервер (крон), а не хитрый игрок
            if (token !== serviceRoleKey) {
                throw new Error("Отказано в доступе. Требуется сервисный ключ.");
            }
            // Крону не нужен объект user, передаем только базу
            result = await apiRoutes[action](adminDb);
        } 
        // 🟢 ОБЫЧНАЯ ЛОГИКА ДЛЯ ИГРОКОВ
        else {
            const supabaseAuthClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? ''
            );

            const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);
            if (authError || !user) throw new Error("Ошибка авторизации: " + authError?.message);

            result = await apiRoutes[action](data, user, adminDb);
        }

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
});