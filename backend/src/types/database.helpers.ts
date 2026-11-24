import type { Database } from "./database.types.ts";
/**
 * Вспомогательный тип: извлекает тип готовой строки из таблицы public-схемы.
 * Использование: TableRow<"users">
 */
export type DbTableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/**
 * Вспомогательный тип: извлекает тип данных, нужных для вставки новой записи.
 * Поля с дефолтными значениями (id, created_at) здесь опциональны.
 * Использование: TableInsert<"users">
 */
export type DbTableInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

/**
 * Вспомогательный тип: извлекает тип данных для обновления существующей записи.
 * Все поля опциональны.
 * Использование: TableUpdate<"users">
 */
export type DbTableUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

/**
 * Вспомогательный тип: извлекает enum-типы из базы данных.
 * Использование: DbEnum<"entity_type">
 */
export type DbEnum<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];