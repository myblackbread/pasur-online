import type { DbEnum, DbTableInsert, DbTableRow, DbTableUpdate } from "../database.helpers.ts";
import type { TimestampISO, UUID } from "../primitives.ts";
import type { Json } from "../database.types.ts";

/**
 * Пол пользователя:
 * - "male": Мужской
 * - "female": Женский
 */
export type Gender = DbEnum<"gender">;

/**
 * Категории причин удаления аккаунта:
 * - "privacy_concerns": Опасения за конфиденциальность
 * - "bad_matchmaking": Плохой подбор игроков
 * - "too_many_bugs": Ошибки в приложении
 * - "found_alternative": Альтернативный сервис
 * - "no_longer_needed": Не актуально
 * - "other": Свой вариант
 */
export type UserDeletionReasonType = DbEnum<"user_deletion_reason_type">;

/**
 * Сырая строка пользователя из таблицы users.
 */
export type UserRow = DbTableRow<"users">;

/**
 * Данные для вставки в таблицу users.
 */
export type UserInsert = DbTableInsert<"users">;

/**
 * Данные для обновления в таблице users.
 */
export type UserUpdate = DbTableUpdate<"users">;

/**
 * Доменная модель профиля пользователя.
 */
export interface UserProfile {
  /** Идентификатор пользователя (совпадает с auth.users.id и entities.id) */
  id: UUID;
  /** Отображаемое имя (3-60 символов, либо null при незаполненном профиле) */
  displayName: string | null;
  /** Пол пользователя (гарантирован базой данных) */
  gender: Gender;
  /** Аватар (символ эмодзи), либо null */
  avatar: string | null;
  /** Флаг системного администратора */
  isAdmin: boolean;
  /** Режим инкогнито */
  isIncognito: boolean;
  /** Настройки клиента в формате JSON */
  settings: Json;
  /** Идентификатор выбранной категории причины удаления (холодная ссылка) */
  deletionReasonId: UUID | null;
  /** Метка времени заявки на удаление (null = аккаунт активен) */
  deletedAt: TimestampISO | null;
}

/**
 * Доменная модель зарегистрированного устройства пользователя.
 */
export interface UserDevice {
  /** Идентификатор инсталляции */
  id: UUID;
  /** Идентификатор владельца устройства */
  userId: UUID;
  /** Дата первой регистрации устройства */
  createdAt: TimestampISO;
}

/**
 * Дисциплинарная игровая статистика пользователя.
 */
export interface UserStatistics {
  /** Идентификатор пользователя */
  userId: UUID;
  /** Число преждевременных выходов из запущенного матча */
  abandonsCount: number;
  /** Время последней фиксации выхода */
  lastAbandonAt: TimestampISO | null;
  /** Число пропусков подтверждения найденного матча */
  dodgesCount: number;
  /** Время последней фиксации пропуска */
  lastDodgeAt: TimestampISO | null;
}

/**
 * Доменная модель записи блокировки между пользователями.
 */
export interface UserBlock {
  /** Инициатор блокировки */
  blockerId: UUID;
  /** Заблокированный пользователь */
  blockedId: UUID;
}

/**
 * Агрегированная статистика категорий удаления аккаунтов.
 */
export interface UserDeletionReason {
  /** Идентификатор категории */
  id: UUID;
  /** Категория причины */
  reason: UserDeletionReasonType;
  /** Счетчик выборов данной категории */
  count: number;
  /** Дата создания категории */
  createdAt: TimestampISO | null;
}

/**
 * Текстовый отзыв пользователя при выборе категории "other".
 */
export interface UserDeletionCustomFeedback {
  /** Идентификатор отзыва */
  id: UUID;
  /** Идентификатор категории причины */
  reasonId: UUID;
  /** Категория причины (всегда "other") */
  reasonType: UserDeletionReasonType;
  /** Текст отзыва (до 1000 символов) */
  feedbackText: string;
  /** Дата отправки отзыва */
  createdAt: TimestampISO | null;
}