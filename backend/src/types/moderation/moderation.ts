import type { DbEnum, DbTableRow } from "../database.helpers.ts";
import type { TimestampISO, UUID } from "../primitives.ts";

/**
 * Статус тикета модерации:
 * - "pending": Ожидает рассмотрения модератором или арбитражем
 * - "resolved": Жалоба рассмотрена, решение вынесено
 */
export type TicketStatus = DbEnum<"ticket_status">;

/**
 * Сырая строка таблицы review_tickets из базы данных.
 */
export type ReviewTicketRow = DbTableRow<"review_tickets">;

/**
 * Доменная модель тикета модерации (жалобы).
 */
export interface ReviewTicket {
  /** Уникальный идентификатор тикета */
  id: UUID;
  /** Сущность-автор жалобы (пользователь или система) */
  reporterId: UUID;
  /** Сущность, на которую подана жалоба */
  targetId: UUID;
  /** Причина подачи жалобы */
  reason: string;
  /** Развернутое описание инцидента от заявителя, либо null */
  description: string | null;
  /** Текущий статус рассмотрения */
  status: TicketStatus;
  /** Комментарий модератора по итогам разбора, либо null */
  resolutionNotes: string | null;
  /** Время создания тикета */
  createdAt: TimestampISO;
  /** Время последнего обновления тикета */
  updatedAt: TimestampISO;
}

/**
 * Сырая строка таблицы ticket_chat_messages из базы данных.
 */
export type TicketChatMessageRow = DbTableRow<"ticket_chat_messages">;

/**
 * Доменная модель сообщения внутри чата разбора тикета.
 * Содержит Ed25519-подпись автора для юридической/арбитражной неотказуемости (Non-repudiation).
 */
export interface TicketChatMessage {
  /** Уникальный идентификатор сообщения */
  id: UUID;
  /** Идентификатор тикета, к которому относится сообщение */
  ticketId: UUID;
  /** Пользователь-автор сообщения */
  authorId: UUID;
  /** Подписанная полезная нагрузка сообщения (текст/метаданные) */
  signedPayload: string;
  /** Криптографическая подпись полезной нагрузки */
  signature: string;
  /** Клиентское время отправки сообщения */
  sentAt: TimestampISO;
  /** Серверное время фиксации записи в БД */
  createdAt: TimestampISO;
}

/**
 * Сырая строка таблицы entity_blocks из базы данных.
 */
export type EntityBlockRow = DbTableRow<"entity_blocks">;

/**
 * Доменная модель блокировки (бана) сущности.
 */
export interface EntityBlock {
  /** Уникальный идентификатор блокировки */
  id: UUID;
  /** Заблокированная сущность (пользователь, комната и т.д.) */
  entityId: UUID;
  /** Причина наложения блокировки */
  reason: string;
  /** Временной интервал блокировки Postgres (например, "7 days" или tstzrange) */
  period: unknown;
  /** Метка времени наложения блокировки */
  blockedAt: TimestampISO;
  /** Метка времени фактического снятия блокировки (null, если бан активен) */
  unblockedAt: TimestampISO | null;
}

/**
 * Доменная связь тикета с матчем, в котором зафиксировано нарушение.
 */
export interface TicketMatch {
  /** Идентификатор тикета */
  ticketId: UUID;
  /** Идентификатор матча */
  matchId: UUID;
}

/**
 * Доменная связь наложенной блокировки с тикетом-основанием.
 */
export interface EntityBlockTicket {
  /** Идентификатор блокировки */
  blockId: UUID;
  /** Идентификатор заблокированной сущности */
  entityId: UUID;
  /** Идентификатор рассмотренного тикета */
  ticketId: UUID;
  /** Время привязки */
  createdAt: TimestampISO;
}