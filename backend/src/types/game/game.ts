import type { DbEnum, DbTableRow } from "../database.helpers.ts";
import type { TimestampISO, UUID } from "../primitives.ts";
import type { Json } from "../database.types.ts";

/**
 * Тип карточной игры в системе:
 * - "pasur": Пасур
 * - "durak": Дурак
 */
export type GameType = DbEnum<"game_type">;

/**
 * Жизненный цикл игрового матча:
 * - "waiting": Ожидание сбора игроков
 * - "playing": Активная фаза игры
 * - "paused": Временная пауза
 * - "finished": Матч успешно завершен
 * - "cancelled": Матч отменен
 */
export type MatchStatus = DbEnum<"match_status">;

/**
 * Специфичные правила для Пасура, хранящиеся внутри rulesPayload.
 */
export interface PasurRulesPayload {
  ruleSet: "classic" | "local";
  isStrict: boolean;
  isSuddenDeath: boolean;
  isJacksDealerReserved: boolean;
}

/**
 * Специфичные правила для Дурака, хранящиеся внутри rulesPayload.
 */
export interface DurakRulesPayload {
  isTransferable: boolean;
  deckSize: 24 | 36 | 52;
}

/**
 * Полиморфный тип настроек правил для всех игр.
 */
export type GameRulesPayload = PasurRulesPayload | DurakRulesPayload | Record<string, unknown>;

/**
 * Сырая строка таблицы rooms из базы данных.
 */
export type RoomRow = DbTableRow<"rooms">;

/**
 * Доменная модель игровой комнаты.
 */
export interface GameRoom {
  /** Уникальный идентификатор комнаты (совпадает с entities.id) */
  id: UUID;
  /** Отображаемое имя комнаты, либо null */
  displayName: string | null;
  /** Размер обязательной ставки (неделимые единицы, >= 0) */
  betAmount: number;
  /** Хэш секретного кода доступа (null, если публичная) */
  joinCodeHash: string | null;
  /** Метка времени дедлайна активности (epoch ms), либо null */
  activeDeadline: number | null;
  /** Метка последнего обновления комнаты */
  updatedAt: TimestampISO;
}

/**
 * Сырая строка таблицы settings из базы данных.
 */
export type GameSettingsRow = DbTableRow<"settings">;

/**
 * Универсальная доменная конфигурация правил матча.
 */
export interface GameSettings {
  /** Уникальный идентификатор пресета настроек */
  id: UUID;
  /** Категория игры */
  gameType: GameType;
  /** Требуемое количество игроков за столом */
  requiredPlayers: number;
  /** Длительность одного хода в секундах */
  turnDuration: number;
  /** Специфичный для игры набор правил в формате JSON */
  rulesPayload: GameRulesPayload;
}

/**
 * Сырая строка таблицы matches из базы данных.
 */
export type MatchRow = DbTableRow<"matches">;

/**
 * Доменная модель матча в памяти сервера.
 */
export interface Match {
  /** Уникальный идентификатор матча */
  id: UUID;
  /** Идентификатор комнаты, в которой проводится матч */
  roomId: UUID;
  /** Идентификатор применяемых настроек матча, либо null */
  settingsId: UUID | null;
  /** Идентификатор группы криптографических участников, либо null */
  groupId: UUID | null;
  /** Текущий статус матча */
  status: MatchStatus;
  /** Порядковый номер ревизии состояния матча */
  version: number;
  /** Время создания матча */
  createdAt: TimestampISO;
}

/**
 * Сырая строка таблицы match_game_states из базы данных.
 */
export type MatchGameStateRow = DbTableRow<"match_game_states">;

/**
 * Снимок актуального игрового состояния стола.
 */
export interface MatchGameState {
  /** Идентификатор матча (1:1 связь с matches.id) */
  matchId: UUID;
  /** Сериализованный снимок игрового состояния */
  gameState: Json;
  /** Время фиксации снимка */
  createdAt: TimestampISO;
}