export const ErrorCode = {
    UNAUTHORIZED: 'ERR_UNAUTHORIZED',
    NOT_ADMIN: 'ERR_NOT_ADMIN',
    USER_NOT_FOUND: 'ERR_USER_NOT_FOUND',     
    INVALID_REQUEST: 'ERR_INVALID_REQUEST',    
    
    ROOM_NOT_FOUND: 'ERR_ROOM_NOT_FOUND',
    ROOM_FULL: 'ERR_ROOM_FULL',
    NOT_ENOUGH_MONEY: 'ERR_NOT_ENOUGH_MONEY',
    NOT_IN_ROOM: 'ERR_NOT_IN_ROOM',
    ALREADY_IN_ROOM: 'ERR_ALREADY_IN_ROOM',
    ROOM_ALREADY_STARTED: 'ERR_ROOM_ALREADY_STARTED',
    
    NOT_YOUR_TURN: 'ERR_NOT_YOUR_TURN',
    INVALID_MOVE: 'ERR_INVALID_MOVE',
    WRONG_ROUND_STATE: 'ERR_WRONG_ROUND_STATE',
    PAUSE_ALREADY_ACTIVE: 'ERR_PAUSE_ALREADY_ACTIVE',
    
    AFK_KICKED: 'MSG_AFK_KICKED',
    MODERATOR_KICKED: 'MSG_MODERATOR_KICKED',
    SURRENDERED: 'MSG_SURRENDERED',
    READY_TIMEOUT: 'MSG_READY_TIMEOUT',
    
    INTERNAL_SERVER_ERROR: 'ERR_INTERNAL_SERVER_ERROR'
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export class GameError extends Error {
    public code: ErrorCodeType;

    constructor(code: ErrorCodeType, message?: string) {
        super(message || code); 
        this.code = code;
        this.name = 'GameError';
    }
}