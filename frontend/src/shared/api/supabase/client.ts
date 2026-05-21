import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Отсутствуют переменные окружения Supabase!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function callApi(action: string, data: any = {}) {
    const { data: result, error } = await supabase.functions.invoke('game-api', {
        body: { action, data }
    });

    if (error) throw new Error("err_network");
    if (result?.error) throw new Error(result.error);
    return result;
}