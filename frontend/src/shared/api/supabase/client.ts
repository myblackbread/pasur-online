import { createClient } from '@supabase/supabase-js';
import type { ApiActionMap, ApiResponseMap } from '@/shared/api/contracts/payloads';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Отсутствуют переменные окружения Supabase!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function callApi<K extends keyof ApiActionMap>(
    action: K, 
    ...payload: ApiActionMap[K] extends Record<string, never> ? [data?: {}] : [data: ApiActionMap[K]]
): Promise<ApiResponseMap[K]> {
    const data = payload[0] || {};
    
    const { data: result, error } = await supabase.functions.invoke('game-api', {
        body: { action, data }
    });

    if (error) throw new Error("ERR_NETWORK");
    if (result?.error) throw new Error(result.error);
    
    return result as ApiResponseMap[K];
}