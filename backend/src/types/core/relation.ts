import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type { TimestampISO, UUID } from "../primitives.ts";
import type { EntityRef } from "./entity.ts";

/**
 * Сырая строка из таблицы entity_relations в базе данных.
 */
export type EntityRelationRow = DbTableRow<"entity_relations">;

/**
 * Данные для первичной вставки записи в таблицу entity_relations.
 */
export type EntityRelationInsert = DbTableInsert<"entity_relations">;

/**
 * Модель тернарного отношения в оперативной памяти сервера.
 * Представляет связный кортеж (space, subject, target).
 */
export interface EntityRelation {
  /** Уникальный идентификатор записи отношения */
  id: UUID;
  /** Контекст/пространство, внутри которого определена связь */
  space: EntityRef;
  /** Субъект отношения */
  subject: EntityRef;
  /** Объект отношения (цель) */
  target: EntityRef;
  /** Метка времени создания связи */
  createdAt: TimestampISO;
  /** Время истечения срока действия связи (null = бессрочно) */
  expiresAt: TimestampISO | null;
}