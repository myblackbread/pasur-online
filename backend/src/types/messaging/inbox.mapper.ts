import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type { Inbox, InboxMessage } from "./inbox.ts";
import type { SignalMessageType } from "../identity/crypto.ts";

/**
 * Алгоритмическая утилита конвертации Postgres hex-формата в Uint8Array.
 * [Алгоритмическое исключение]: принимает прямой позиционный параметр без props.
 */
function hexToBytes(hexString: string): Uint8Array {
  const cleanHex = hexString.startsWith("\\x") ? hexString.slice(2) : hexString;
  const length = cleanHex.length / 2;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Алгоритмическая утилита конвертации Uint8Array в Postgres hex-формат.
 * [Алгоритмическое исключение]: принимает прямой позиционный параметр без props.
 */
function bytesToHex(bytes: Uint8Array): string {
  let hex = "\\x";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export const InboxMapper = {
  /**
   * Преобразует строку таблицы inboxes в доменную модель Inbox.
   */
  toDomain(props: { row: DbTableRow<"inboxes"> }): Inbox {
    return {
      id: props.row.id,
      identityId: props.row.identity_id,
      accessLevel: props.row.access_level,
      isAcceptingMessages: props.row.is_accepting_messages,
      isLockedForReview: props.row.is_locked_for_review,
    };
  },

  /**
   * Преобразует модель ящика в формат сохранения таблицы inboxes.
   */
  toPersistence(props: { inbox: Inbox }): DbTableInsert<"inboxes"> {
    return {
      id: props.inbox.id,
      identity_id: props.inbox.identityId,
      access_level: props.inbox.accessLevel,
      is_accepting_messages: props.inbox.isAcceptingMessages,
      is_locked_for_review: props.inbox.isLockedForReview,
    };
  },
};

export const InboxMessageMapper = {
  /**
   * Преобразует строку таблицы inbox_messages в доменное сообщение с байтами.
   */
  toDomain(props: { row: DbTableRow<"inbox_messages"> }): InboxMessage {
    return {
      id: props.row.id,
      inboxId: props.row.inbox_id,
      clientMessageId: props.row.client_message_id,
      messageType: props.row.message_type as SignalMessageType,
      encryptedPayload: hexToBytes(props.row.encrypted_payload),
    };
  },

  /**
   * Преобразует доменное сообщение в формат сохранения таблицы inbox_messages.
   */
  toPersistence(props: { message: InboxMessage }): DbTableInsert<"inbox_messages"> {
    return {
      id: props.message.id,
      inbox_id: props.message.inboxId,
      client_message_id: props.message.clientMessageId,
      message_type: props.message.messageType,
      encrypted_payload: bytesToHex(props.message.encryptedPayload),
    };
  },
};