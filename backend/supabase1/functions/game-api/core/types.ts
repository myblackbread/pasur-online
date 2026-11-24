import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database/database.types.ts";

/** Базовый интерфейс параметров для всех API-экшенов */
export interface BaseActionParams {
    /** Клиент базы данных Supabase со встроенными типами */
    db: SupabaseClient<Database>;
    /** Реальный ID пользователя, который инициировал запрос */
    userId: string;
}

/** * Возможные причины завершения матча или выхода игрока.
 * 'surrender' - сдался,
 * 'timeout' - вышел по таймеру хода,
 * 'banned' - забанен админом,
 * 'lobby_leave' - вышел до начала игры,
 * 'cron_delete' - удалено системой из-за зависания,
 * 'cron_pause_timeout' - удалено системой после долгой паузы,
 * 'match_finished' - нормальное завершение игры.
 */
export type LeaveReason = 'surrender' | 'timeout' | 'banned' | 'lobby_leave' | 'cron_delete' | 'cron_pause_timeout' | 'match_finished';