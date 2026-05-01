export type RuleSet = 'local' | 'classic';
// 🟢 ДОБАВЛЕН СТАТУС pause_requested
export type RoomStatus = 'waiting' | 'ready_check' | 'playing' | 'finished' | 'paused' | 'ready_check_resume' | 'pause_requested';

export interface UserProfile {
    uid: string;
    displayName: string;
    balance: number;
    createdAt: number;
    lastActive: number;
    avatarEmoji?: string;
    isDeleted?: boolean; 
    gender: 'male' | 'female';
    activeRooms?: string[];
    settings?: {
        isIncognito?: boolean;
        blockedUids?: string[];
    };
}

export interface Card { id: string; suit: string; rank: string; value: number; str: string; }

export interface PlayerState {
    id: string; teamId: number; hand: Card[]; captured: Card[]; surs: number;
}

export interface GameState {
    ruleSet: RuleSet;
    isStrict: boolean;
    deck: Card[];
    deckCount?: number;
    table: Card[];
    players: PlayerState[];
    currentTurnIndex: number;
    matchScores: { [teamId: number]: number };
    isRoundOver: boolean;
    isMatchOver: boolean;
    matchWinnerTeamId: number | null;
    roundNumber: number;
    dealerReservedJacks: Card[];     
    lastCapturerTeamId: number | null;   
    
    lastAction?: {
        playerId: string;
        playedCard: Card;
        capturedCards: Card[];
        timestamp: number;
    } | null;
}

export interface PlayerInfo {
    id: string;
    name: string;
    isReady: boolean;
}

export interface GameRoom {
    id?: string;
    players: PlayerInfo[];
    maxPlayers: number;
    betAmount: number;
    ruleSet: RuleSet;
    isStrict: boolean;
    status: RoomStatus;
    createdAt: number;
    readyDeadline?: number | null;
    turnDeadline?: number | null;
    gameState?: GameState | null;    
    adminMessage?: string | null;
    isPrivate?: boolean;
    joinCode?: string | null;
    pauseProposals?: string[];
    lastReaction?: { emoji: string; senderId: string; timestamp: number; } | null;
}