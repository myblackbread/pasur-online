import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "@supabase/functions-js/edge-runtime.d.ts";

import { secureCreateRoom, devAddMoney } from "./api/roomCreation.ts";
import { secureJoinRoom, secureToggleReady, secureResolveReadyTimeout } from "./api/roomLobby.ts";
import { secureProposePause, securePlayCard, secureLeaveRoom, secureNextRound, secureGetMyMask, secureSendReaction } from "./api/roomGameplay.ts";
import { adminDeleteUser } from "./api/admin.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { action, data } = await req.json();
        const authHeader = req.headers.get('Authorization');
        
        if (!authHeader) throw new Error("Требуется авторизация");

        // 🟢 ФИКС: Создаем клиент без глобальных заголовков
        const supabaseAuthClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );

        // 🟢 ФИКС: Достаем чистый токен (убираем слово "Bearer ")
        const token = authHeader.replace('Bearer ', '').trim();
        
        // 🟢 ФИКС: Явно передаем токен внутрь getUser()
        const { data: { user }, error: authError } = await supabaseAuthClient.auth.getUser(token);
        
        if (authError || !user) throw new Error("Ошибка авторизации: " + authError?.message);

        const adminDb = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        let result;
        
        switch (action) {
            case 'devAddMoney': result = await devAddMoney(user, adminDb); break;
            case 'secureCreateRoom': result = await secureCreateRoom(data, user, adminDb); break;
            case 'secureJoinRoom': result = await secureJoinRoom(data, user, adminDb); break;
            case 'secureToggleReady': result = await secureToggleReady(data, user, adminDb); break;
            case 'secureResolveReadyTimeout': result = await secureResolveReadyTimeout(data, user, adminDb); break;
            case 'secureProposePause': result = await secureProposePause(data, user, adminDb); break;
            case 'securePlayCard': result = await securePlayCard(data, user, adminDb); break;
            case 'secureLeaveRoom': result = await secureLeaveRoom(data, user, adminDb); break;
            case 'secureNextRound': result = await secureNextRound(data, user, adminDb); break;
            case 'secureGetMyMask': result = await secureGetMyMask(data, user, adminDb); break;
            case 'secureSendReaction': result = await secureSendReaction(data, user, adminDb); break;
            case 'adminDeleteUser': result = await adminDeleteUser(data, user, adminDb); break;
            default: throw new Error(`Неизвестное действие: ${action}`);
        }

        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
});