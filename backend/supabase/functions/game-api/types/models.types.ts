import { Database } from "./database.types.ts";

// ==========================================
// 1. БЕРЕМ ТИПЫ ИЗ БАЗЫ ДАННЫХ
// ==========================================
/** Набор правил игры (например, 'local' или 'classic') */
export type RuleSet = Database['public']['Enums']['rule_set'];

/** Текущий статус комнаты (ожидание, игра, пауза, завершена) */
export type RoomStatus = Database['public']['Enums']['room_status'];

// ==========================================
// 2. БАЗОВЫЕ ТИПЫ КАРТ
// ==========================================
/** Масть карты (Пики, Черви, Бубны, Трефы) */
export type Suit = '♠' | '♥' | '♦' | '♣';

/** Ранг (достоинство) карты от 2 до Туза */
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

/** * Чистая сущность карты. 
 * Содержит только неизменные физические характеристики.
 */
export interface BaseCard {
    /** Масть карты */
    suit: Suit;
    /** Ранг карты */
    rank: Rank;
}

/** * Игровая карта, привязанная к конкретной раздаче.
 * Наследует масть и ранг, но имеет уникальный идентификатор для отслеживания.
 */
export interface GameCard extends BaseCard {
    /** Уникальный случайный UUID карты в рамках текущей партии */
    id: string;
}

// ==========================================
// 3. ИГРОКИ И СТАТИСТИКА
// ==========================================
/** * Состояние игрока непосредственно во время матча (внутри игрового движка).
 */
export interface Player {
    /** Публичный идентификатор игрока (может быть анонимным маскированным ID) */
    id: string;
    /** Номер команды (0 или 1) */
    teamId: number;
    /** Карты, которые сейчас находятся в руке у игрока */
    hand: GameCard[];
    /** Карты, которые игрок забрал со стола (взятки) */
    captured: GameCard[];
    /** Количество "суров" (чистых столов), сделанных игроком */
    surs: number;
}

/** * Игрок в контексте лобби ожидания.
 * Сохраняется в массив `players` модели комнаты.
 */
export interface RoomPlayer {
    /** Публичный идентификатор игрока */
    id: string;
    /** Флаг готовности к началу игры */
    isReady: boolean;
}

/** * Статистика команды за один раунд (используется для подсчета очков в конце).
 */
export interface TeamStats {
    /** Заработанные очки за раунд */
    score: number;
    /** Общее количество забранных карт */
    cards: number;
    /** Количество забранных треф (крести) */
    clubs: number;
    /** Забрана ли 10 бубен */
    has10D: boolean;
    /** Забрана ли 2 треф (крести) */
    has2C: boolean;
    /** Количество забранных тузов */
    aces: number;
    /** Количество забранных валетов */
    jacks: number;
    /** Суммарное количество "суров" команды */
    surs: number;
}

// ==========================================
// 4. ТАЙМЛАЙНЫ И АНИМАЦИИ
// ==========================================
/** Доступные типы действий для системы анимации на клиенте */
export type AnimationAction = 'deal_table' | 'deal_hand' | 'play' | 'capture' | 'sweep';

/** * Строгая типизация точек старта и финиша для летящих карт.
 */
export type AnimationEndpoint = 'deck' | 'table' | { playerId: string };

/** * Единичная команда анимации (одно движение одной карты).
 */
export interface AnimationCommand {
    /** ID летящей карты. Если null — фронтенд должен отрендерить скрытую карту (рубашку) */
    cardId: string | null;         
    /** Что именно происходит (раздача, бросок, забор взятки) */
    action: AnimationAction;
    /** Откуда вылетает карта */
    source: AnimationEndpoint; 
    /** Куда прилетает карта */
    target: AnimationEndpoint; 
    /** Задержка ПЕРЕД стартом этой конкретной анимации (в миллисекундах от начала общего сценария) */
    delay: number;                 
    /** Сколько времени карта находится в полете (в миллисекундах) */
    duration: number;              
}

/** * Полный сценарий анимаций для последнего хода/события.
 */
export interface AnimationTrack {
    /** Уникальный UUID трека (чтобы фронтенд случайно не проиграл старую анимацию дважды) */
    id: string;                    
    /** Массив команд, которые нужно проиграть (могут идти параллельно или последовательно) */
    commands: AnimationCommand[];
}

// ==========================================
// 5. СОСТОЯНИЯ ИГРЫ И НАСТРОЙКИ (STATE)
// ==========================================
/**
 * Базовые настройки конфигурации комнаты.
 * Вынесены отдельно, чтобы избежать дублирования между Payload, Room и фильтрами.
 */
export interface RoomConfig {
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
    /** Требуемое количество игроков */
    requiredPlayers: number;
    /** Разрешены ли паузы в игре */
    allowPauses: boolean;
    /** Длительность хода в миллисекундах */
    turnDuration: number;
}

/** * Публичное состояние игры. 
 * Синхронизируется со всеми клиентами. Не содержит никаких ID скрытых карт.
 */
export interface PublicGameState {
    /** Количество карт, оставшихся в колоде (самой колоды тут нет!) */
    deckCount: number;
    /** Открытые карты, лежащие в данный момент на столе */
    table: GameCard[];
    /** Массив игроков (сами карты в руках скрыты, передается только их количество `handCount`) */
    players: Array<Omit<Player, 'hand'> & { handCount: number }>;
    /** Индекс игрока в массиве `players`, чей сейчас ход */
    currentTurnIndex: number;
    /** Текущий счет матча по командам (например, { 0: 5, 1: 8 }) */
    matchScores: Record<number, number>;
    /** Флаг завершения текущего раунда (когда колода пуста и карты на руках закончились) */
    isRoundOver: boolean;
    /** ID победившей команды (0 или 1), если матч завершен, иначе null */
    matchWinnerTeamId: number | null;
    /** Текущий номер раунда (начинается с 0) */
    roundNumber: number;
    /** ID конкретного игрока, который последним забрал взятку со стола */
    lastCapturerPlayerId: string | null;
    /** Сценарий для аниматора на фронтенде */
    animationTrack: AnimationTrack | null;
}

/** * Полное (секретное) состояние игры. 
 * Хранится только в таблице `room_secrets` и содержит ВСЕ скрытые данные для валидации ходов бекендом.
 */
export interface FullGameState extends Omit<PublicGameState, 'players' | 'deckCount'> {
    /** Оставшаяся колода с реальными картами */
    deck: GameCard[];
    /** Игроки с реальными массивами карт в руках (`hand`) */
    players: Player[];
}

/** * Жалоба на игрока (АФК или другие нарушения). 
 */
export type RoomComplaint = {
    /** ID подозреваемого игрока */
    suspect: string;
    /** Время подачи жалобы (Unix timestamp) */
    timestamp: number;
};

// ==========================================
// 6. ЧИСТЫЕ МОДЕЛИ БИЗНЕС-ЛОГИКИ (camelCase)
// ==========================================
/** * Модель комнаты для использования в бизнес-логике. 
 * Полностью отвязана от snake_case базы данных.
 */
export interface Room extends RoomConfig {
    id: string;
    name: string | null;
    status: RoomStatus;
    players: RoomPlayer[];
    publicGameState: PublicGameState | null;
    complaints: Record<string, RoomComplaint[]> | null;
    joinCooldowns: Record<string, number> | null;
    activeDeadline: number | null;
    adminMessage: string | null;
    joinCode: string | null;
    createdAt: number;
    updatedAt: number;
    version: number;
}

/** * Модель секретов комнаты для использования в бизнес-логике.
 */
export interface RoomSecrets {
    roomId: string;
    fullGameState: FullGameState | null;
    realUids: Record<string, string> | null;
}

/** * Пользовательские настройки (темы, аватарки, режим инкогнито).
 */
export interface UserSettings {
    isIncognito?: boolean;
}

/** * Модель пользователя для использования в бизнес-логике.
 */
export interface User {
    id: string;
    displayName: string;
    balance: number;
    isAdmin: boolean;
    isDeleted: boolean | null;
    activeRooms: string[];
    settings: UserSettings | null;
}