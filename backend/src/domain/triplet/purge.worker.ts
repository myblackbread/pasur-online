import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.types.ts";
import type { UUID } from "../../types/primitives.ts";
import type { RelationsService } from "./service.ts";

interface PurgeTaskRow {
  id: string;
  entity_id: string;
  status: "pending" | "processing" | "completed" | "failed";
}

/**
 * Фоновый обработчик очереди на удаление сущностей.
 * Координирует очистку графа связей и последующее удаление строки сущности из базы.
 */
export class PurgeQueueWorker {
  constructor(
    private client: SupabaseClient<Database>,
    private relationsService: RelationsService,
  ) {}

  /**
   * Запускает обработчик и активирует Realtime-подписку с автодовычиткой задач.
   */
  start(): void {
    this.subscribeToQueue();
  }

  /**
   * Обработка накопившихся задач со статусом 'pending'.
   * Вызывается при первичном подключении и после каждого восстановления соединения.
   */
  private async processPendingTasks(): Promise<void> {
    const { data, error } = await (this.client
      .from("entity_purge_queue" as never)
      .select("id, entity_id, status")
      .eq("status", "pending")
      .order("created_at", { ascending: true }) as unknown as Promise<{
        data: PurgeTaskRow[] | null;
        error: Error | null;
      }>);

    if (error) {
      console.error("PurgeQueueWorker: ошибка выборки pending-задач:", error.message);
      return;
    }

    if (!data || data.length === 0) return;

    for (const task of data) {
      await this.executeTask(task.id, task.entity_id as UUID);
    }
  }

  /**
   * Подписка на добавление новых задач через Realtime WebSocket.
   * Автоматически забирает пропущенные за время разрыва задачи при получении статуса SUBSCRIBED.
   */
  private subscribeToQueue(): void {
    this.client
      .channel("entity-purge-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "entity_purge_queue",
        },
        async (payload) => {
          const task = payload.new as PurgeTaskRow;
          if (task.status === "pending") {
            await this.executeTask(task.id, task.entity_id as UUID);
          }
        },
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await this.processPendingTasks();
        }
      });
  }

  /**
   * Выполняет процедуру удаления сущности с синхронизацией через completion.
   */
  private async executeTask(taskId: string, entityId: UUID): Promise<void> {
    // 1. Фиксируем взятие задачи в обработку
    await (this.client.from("entity_purge_queue" as never).update({
      status: "processing",
    } as never).eq("id", taskId) as unknown as Promise<unknown>);

    try {
      // 2. Очищаем связи и удаляем сущность внутри единого захвата writeQueue
      await this.relationsService.purgeEntityRelations({
        entityId,
        onComplete: async () => {
          const { error: deleteError } = await this.client
            .from("entities")
            .delete()
            .eq("id", entityId);

          if (deleteError) {
            throw new Error(`Failed to delete entity row: ${deleteError.message}`);
          }
        },
      });

      // 3. Помечаем задачу как успешно завершенную
      await (this.client.from("entity_purge_queue" as never).update({
        status: "completed",
        processed_at: new Date().toISOString(),
      } as never).eq("id", taskId) as unknown as Promise<unknown>);

      console.log(`PurgeQueueWorker: сущность ${entityId} успешно удалена.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`PurgeQueueWorker: ошибка при удалении сущности ${entityId}:`, errorMessage);

      // 4. Фиксируем ошибку в очереди
      await (this.client.from("entity_purge_queue" as never).update({
        status: "failed",
        error_message: errorMessage,
        processed_at: new Date().toISOString(),
      } as never).eq("id", taskId) as unknown as Promise<unknown>);
    }
  }
}