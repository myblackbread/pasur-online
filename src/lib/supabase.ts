import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Отсутствуют переменные окружения Supabase!");
}

// Создаем и экспортируем клиент
export const supabase = createClient(supabaseUrl, supabaseAnonKey);