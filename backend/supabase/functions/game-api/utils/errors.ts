export const ErrorCode = {
    // 🔒 Авторизация и доступ
    UNAUTHORIZED: 'ERR_UNAUTHORIZED',
    NOT_ADMIN: 'ERR_NOT_ADMIN',
    USER_NOT_FOUND: 'ERR_USER_NOT_FOUND',     
    INVALID_REQUEST: 'ERR_INVALID_REQUEST',    
    UNSUPPORTED_ACTION: 'ERR_UNSUPPORTED_ACTION',
    
    // 🚪 Лобби и комнаты
    ROOM_NOT_FOUND: 'ERR_ROOM_NOT_FOUND',
    ROOM_FULL: 'ERR_ROOM_FULL',
    NOT_ENOUGH_MONEY: 'ERR_NOT_ENOUGH_MONEY',
    NOT_IN_ROOM: 'ERR_NOT_IN_ROOM',
    ALREADY_IN_ROOM: 'ERR_ALREADY_IN_ROOM',
    ROOM_ALREADY_STARTED: 'ERR_ROOM_ALREADY_STARTED',
    ON_COOLDOWN: 'ERR_ON_COOLDOWN',
    INVALID_ROOM_CONFIG: 'ERR_INVALID_ROOM_CONFIG',
    
    // 🎲 Игровой процесс
    NOT_YOUR_TURN: 'ERR_NOT_YOUR_TURN',
    INVALID_MOVE: 'ERR_INVALID_MOVE',
    WRONG_ROUND_STATE: 'ERR_WRONG_ROUND_STATE',
    PAUSE_ALREADY_ACTIVE: 'ERR_PAUSE_ALREADY_ACTIVE',
    TARGET_NOT_FOUND: 'ERR_TARGET_NOT_FOUND',
    
    // 🛑 Системные сообщения (используются для admin_message)
    AFK_KICKED: 'MSG_AFK_KICKED',
    MODERATOR_KICKED: 'MSG_MODERATOR_KICKED',
    SURRENDERED: 'MSG_SURRENDERED',
    READY_TIMEOUT: 'MSG_READY_TIMEOUT',
    
    // 💥 Сервер
    INTERNAL_SERVER_ERROR: 'ERR_INTERNAL_SERVER_ERROR',
    STATE_OUTDATED: 'ERR_STATE_OUTDATED'
} as const;

// Магия TypeScript: получаем строгий тип на основе ключей объекта выше
export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * Кастомный класс ошибки.
 * Ловится на верхнем уровне в index.ts и отдает клиенту чистый { error: "ERR_CODE" }
 */
export class GameError extends Error {
    public code: ErrorCodeType;

    constructor(code: ErrorCodeType) {
        super(code);
        this.code = code;
        this.name = 'GameError';
        Object.setPrototypeOf(this, GameError.prototype);
    }
}