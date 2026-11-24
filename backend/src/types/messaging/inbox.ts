import type { DbTableRow } from "../database.helpers.ts";
import type { UUID } from "../primitives.ts";
import type { SignalMessageType } from "../identity/crypto.ts";

/**
 * Сырая строка таблицы inboxes из схемы базы данных.
 */
export type InboxRow = DbTableRow<"inboxes">;

/**
 * Доменная модель сессионного почтового ящика (Inbox).
 * Изолированный ящик на одного собеседника для разрыва графа связей в БД.
 */
export interface Inbox {
  /** Уникальный идентификатор входящего ящика */
  id: UUID;
  /** Идентификатор крипто-профиля устройства владельца */
  identityId: UUID;
  /** Уровень доступа сессии */
  accessLevel: number;
  /** Флаг готовности принимать входящие сообщения */
  isAcceptingMessages: boolean;
  /** Флаг автоблокировки ящика сервером при аномальном трафике */
  isLockedForReview: boolean;
}

/**
 * Сырая строка таблицы inbox_messages из схемы базы данных.
 */
export type InboxMessageRow = DbTableRow<"inbox_messages">;

/**
 * Доменная модель зашифрованного личного сообщения.
 */
export interface InboxMessage {
  /** Уникальный идентификатор сообщения (UUIDv7) */
  id: UUID;
  /** Идентификатор ящика-получателя */
  inboxId: UUID;
  /** Клиентский идентификатор сообщения для дедупликации */
  clientMessageId: UUID;
  /** Тип сообщения протокола Signal (2, 3 или 7) */
  messageType: SignalMessageType;
  /** Зашифрованное тело сообщения в виде бинарного массива */
  encryptedPayload: Uint8Array;
}