import { RuleSet } from "./game";

/** Текущий статус комнаты (ожидание, игра, пауза, завершена) */
export type RoomStatus = 'waiting' | 'playing' | 'paused' | 'finished';

/** * Игрок в контексте лобби ожидания.
 */
export interface RoomPlayer {
    /** ID пользователя в системе (null, если гость/бот) */
    userId: string | null;
    /** ID аватара (сгенерированный uuid5 или реальный) (null, если без аватара) */
    avatarId: string | null;
    /** Флаг готовности к началу игры */
    isReady: boolean;
    /** Дата и время присоединения к комнате в формате ISO строки */
    joinedAt: string;
}

/** Базовые настройки конфигурации комнаты */
export interface RoomConfig {
    /** Название комнаты (отображается в лобби). Может быть null */
    name: string | null;
    /** Сумма ставки */
    betAmount: number;
    /** Используемый набор правил ('local' или 'classic') */
    ruleSet: RuleSet;
    /** Включен ли строгий режим (обязательное взятие карт, если это возможно) */
    isStrict: boolean;
    /** Включен ли режим внезапной смерти (победа при достижении 11 очков "на лету") */
    isSuddenDeath: boolean;
    /** Откладываем ли валеты дилеру в начале игры (специфика 'local' правил) */
    isJacksDealerReserved: boolean;
    /** Требуемое количество игроков (2 или 4) */
    requiredPlayers: number;
    /** Разрешены ли паузы в игре */
    allowPauses: boolean;
    /** Длительность хода в миллисекундах */
    turnDuration: number;
}

/** * Модель комнаты для использования в бизнес-логике. 
 */
export interface Room extends RoomConfig {
    /** Уникальный ID комнаты */
    id: string;
    /** Текущий статус комнаты (ожидание, игра и т.д.) */
    status: RoomStatus;
    /** Массив игроков, находящихся в комнате */
    players: RoomPlayer[];
    /** Временная метка дедлайна (в миллисекундах), до которой нужно сделать ход/действие */
    activeDeadline: number | null;
    /** Сообщение от администратора для игроков в комнате */
    adminMessage: string | null;
    /** Код для входа в приватную комнату */
    joinCode: string | null;
    /** Дата создания комнаты (ISO строка) */
    createdAt: string;
    /** Дата последнего обновления комнаты (ISO строка) */
    updatedAt: string;
    /** Версия документа для защиты от гонки данных (Optimistic Concurrency Control) */
    version: number;
}