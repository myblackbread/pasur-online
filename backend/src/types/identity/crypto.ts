import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type { UUID } from "../primitives.ts";

/**
 * Допустимые типы сообщений в протоколе Signal / Double Ratchet:
 * - 2: Пре-ключевое сообщение инициализации сессии (PreKeyWhisperMessage)
 * - 3: Стандартное зашифрованное сообщение сессии (WhisperMessage)
 * - 7: Групповое сообщение ключа отправителя (SenderKeyMessage)
 *
 * Ограничение в БД: CHECK (message_type = ANY (ARRAY[2, 3, 7]))
 */
export type SignalMessageType = 2 | 3 | 7;

/**
 * Сырая строка таблицы crypto_identities.
 */
export type CryptoIdentityRow = DbTableRow<"crypto_identities">;

/**
 * Данные для сохранения профиля криптографии.
 */
export type CryptoIdentityInsert = DbTableInsert<"crypto_identities">;

/**
 * Доменная модель криптографической идентичности устройства.
 */
export interface CryptoIdentity {
  /** Идентификатор криптографического профиля */
  id: UUID;
  /** Идентификатор физического устройства пользователя */
  deviceId: UUID;
  /** Долгосрочный публичный ключ идентичности (Identity Key) */
  identityKey: string;
  /** Идентификатор регистрации в библиотеке libsignal */
  registrationId: number;
  /** Подписанный открытый ключ (Signed Prekey) */
  signedPrekey: string;
  /** Идентификатор подписанного ключа */
  signedPrekeyId: number;
  /** Цифровая подпись подписанного ключа */
  signedPrekeySignature: string;
}

/**
 * Сырая строка таблицы crypto_one_time_prekeys.
 */
export type CryptoOneTimePrekeyRow = DbTableRow<"crypto_one_time_prekeys">;

/**
 * Данные для вставки одноразового ключа.
 */
export type CryptoOneTimePrekeyInsert = DbTableInsert<"crypto_one_time_prekeys">;

/**
 * Модель одноразового ключа (One-Time Prekey, OPK).
 */
export interface CryptoOneTimePrekey {
  /** Идентификатор профиля владельца */
  identityId: UUID;
  /** Локальный индекс ключа устройства */
  keyId: number;
  /** Открытый одноразовый ключ */
  publicKey: string;
}

/**
 * Криптографический бандл ключей, запрашиваемый клиентом
 * для инициализации защищенной сессии через RPC-процедуру.
 */
export interface PrekeyBundle {
  /** Идентификатор целевого сессионного ящика-получателя */
  inboxId: UUID;
  /** Идентификатор регистрации получателя */
  registrationId: number;
  /** Публичный ключ идентичности получателя */
  identityKey: string;
  /** Подписанный ключ получателя */
  signedPrekey: string;
  /** Идентификатор подписанного ключа */
  signedPrekeyId: number;
  /** Подпись к подписанному ключу */
  signedPrekeySignature: string;
  /** Идентификатор одноразового ключа (null, если пул исчерпан) */
  oneTimePrekeyId: number | null;
  /** Открытый одноразовый ключ (null, если пул исчерпан) */
  oneTimePrekey: string | null;
}