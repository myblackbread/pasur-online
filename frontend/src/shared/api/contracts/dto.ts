// ==========================================
// БАЗОВЫЕ ЛИТЕРАЛЫ
// ==========================================
export type RuleSetDTO = 'local' | 'classic';
export type RoomStatusDTO = 'waiting' | 'playing' | 'paused' | 'finished';
export type SuitDTO = '♠' | '♥' | '♦' | '♣';
export type RankDTO = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

// ==========================================
// ИГРОВЫЕ СУЩНОСТИ (Стейт движка)
// ==========================================
export interface GameCardDTO {
    id: string;
    suit: SuitDTO;
    rank: RankDTO;
}

export interface PlayerDTO {
    id: string;
    teamId: number;
    hand: GameCardDTO[];
    captured: GameCardDTO[];
    surs: number;
}

// ==========================================
// АНИМАЦИИ И ТАЙМЛАЙНЫ
// ==========================================
export type AnimationActionDTO = 'deal_table' | 'deal_hand' | 'play' | 'capture' | 'sweep';
export type AnimationEndpointDTO = 'deck' | 'table' | { playerId: string };

export interface AnimationCommandDTO {
    cardId: string | null;
    action: AnimationActionDTO;
    source: AnimationEndpointDTO;
    target: AnimationEndpointDTO;
    delay: number;
    duration: number;
}

export interface AnimationTrackDTO {
    id: string;
    commands: AnimationCommandDTO[];
}

// ==========================================
// ПУБЛИЧНЫЙ СТЕЙТ (Без скрытых карт)
// ==========================================
export interface PublicGameStateDTO {
    deckCount: number;
    table: GameCardDTO[];
    players: Array<Omit<PlayerDTO, 'hand'> & { handCount: number }>;
    currentTurnIndex: number;
    matchScores: Record<number, number>;
    isRoundOver: boolean;
    matchWinnerTeamId: number | null;
    roundNumber: number;
    lastCapturerPlayerId: string | null;
    animationTrack: AnimationTrackDTO | null;
}

// ==========================================
// СУЩНОСТИ КОМНАТЫ И ПОЛЬЗОВАТЕЛЯ
// ==========================================
export interface RoomPlayerDTO {
    id: string;
    isReady: boolean;
}

export interface RoomComplaintDTO {
    suspect: string;
    timestamp: number;
}

export interface UserSettingsDTO {
    isIncognito?: boolean;
    blockedUids?: string[];
    avatarEmoji?: string;
    gender?: 'male' | 'female';
}

export interface UserDTO {
    id: string;
    displayName: string;
    balance: number;
    isAdmin: boolean;
    isDeleted: boolean | null;
    activeRooms: string[];
    settings: UserSettingsDTO | null;
}

/**
 * Единая модель комнаты (camelCase, как отдает бэкенд через маппер)
 */
export interface RoomDTO {
    id: string;
    name: string | null;
    betAmount: number;
    ruleSet: RuleSetDTO;
    isStrict: boolean;
    isSuddenDeath: boolean;
    isJacksDealerReserved: boolean;
    requiredPlayers: number;
    allowPauses: boolean;
    turnDuration: number;
    status: RoomStatusDTO;
    players: RoomPlayerDTO[];
    publicGameState: PublicGameStateDTO | null;
    complaints: Record<string, RoomComplaintDTO[]> | null;
    joinCooldowns: Record<string, number> | null;
    activeDeadline: number | null;
    adminMessage: string | null;
    joinCode: string | null;
    createdAt: number;
    updatedAt: number;
    version: number;
}