import type { DbTableRow } from "../database.helpers.ts";
import type { TimestampISO, UUID } from "../primitives.ts";
import type { SignalMessageType } from "../identity/crypto.ts";


/**
 * Сырая строка таблицы participant_groups из схемы Supabase.
 */
export type ParticipantGroupRow = DbTableRow<"participant_groups">;

/**
 * Доменная модель группы участников (чаты комнат, групповые диалоги).
 */
export interface ParticipantGroup {
  /** Идентификатор группы */
  id: UUID;
  /** Время создания группы */
  createdAt: TimestampISO;
}

/**
 * Доменная модель участника группы.
 * Связывает группу с конкретным криптографическим профилем устройства.
 */
export interface GroupParticipant {
  /** Идентификатор записи членства */
  id: UUID;
  /** Идентификатор группы */
  groupId: UUID;
  /** Идентификатор крипто-профиля участника */
  identityId: UUID;
}

/**
 * Доменная модель ключа отправителя (Sender Key) в групповом протоколе Signal.
 * Позволяет эффективно шифровать одно сообщение на всю группу.
 */
export interface GroupSenderKey {
  /** Идентификатор записи ключа */
  id: UUID;
  /** Идентификатор целевой группы */
  groupId: UUID;
  /** Кто сгенерировал ключ (отправитель) */
  senderIdentityId: UUID;
  /** Для кого зашифрован этот ключ (получатель) */
  receiverIdentityId: UUID;
  /** Поколение/раунд ключа (инкрементируется при обновлении ключа) */
  generation: number;
  /** Тип сообщения протокола (2, 3 или 7) */
  messageType: SignalMessageType;
  /** 
   * Зашифрованное тело ключа отправителя (до 65536 байт).
   * В памяти держим как Uint8Array.
   */
  encryptedSenderKey: Uint8Array;
  /** Время фиксации ключа */
  createdAt: TimestampISO;
}

/**
 * Доменная модель группового зашифрованного сообщения.
 */
export interface GroupMessage {
  /** Идентификатор сообщения */
  id: UUID;
  /** Идентификатор группы, куда отправлено сообщение */
  groupId: UUID;
  /** Клиентский идентификатор для дедупликации */
  clientMessageId: UUID;
  /** Идентификатор крипто-профиля автора сообщения */
  senderIdentityId: UUID;
  /** Итерационный номер последовательности ключа (Ratchet iteration) */
  sequenceIteration: number;
  /** Зашифрованное тело сообщения */
  encryptedPayload: Uint8Array;
  /** Время создания */
  createdAt: TimestampISO;
}