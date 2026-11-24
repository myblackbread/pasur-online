import type { DbEnum, DbTableRow } from "../database.helpers.ts";
import type { UUID } from "../primitives.ts";

/**
 * Тип сущности в системе (значения из enum entity_type в базе данных):
 * - "system": Системный корневой контекст (ранг 0).
 * - "room": Игровая комната (ранг 1).
 * - "store": Магазин (ранг 1).
 * - "user": Физический пользователь (ранг 2).
 */
export type EntityType = DbEnum<"entity_type">;

/**
 * Числовой ранг сущности в дереве видимости и прав доступа:
 * - 0: Система (System) — наивысший приоритет.
 * - 1: Контейнеры (Room, Store) — объединяют пользователей.
 * - 2: Листья (User) — конечные участники.
 */
export type EntityRank = 0 | 1 | 2;

/**
 * Алгоритмическая функция вычисления ранга сущности по её типу.
 * [Алгоритмическое исключение]: принимает прямой позиционный параметр без props.
 *
 * @param type Категория сущности
 * @returns Числовой ранг: system -> 0, room/store -> 1, user -> 2
 */
export function getEntityRank(type: EntityType): EntityRank {
  switch (type) {
    case "system":
      return 0;
    case "room":
    case "store":
      return 1;
    case "user":
      return 2;
  }
}

/**
 * Сырая запись сущности из таблицы entities базы данных.
 * Берется напрямую из сгенерированной схемы Supabase.
 */
export type EntityRow = DbTableRow<"entities">;

/**
 * Ссылка на сущность в оперативной памяти сервера.
 * Ранг не хранится, а при необходимости вычисляется вызовом getEntityRank(entityType).
 */
export interface EntityRef {
  /** Уникальный идентификатор сущности */
  id: UUID;
  /** Категория сущности */
  entityType: EntityType;
}