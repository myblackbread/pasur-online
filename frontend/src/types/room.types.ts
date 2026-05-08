import { GameState, RuleSet } from './game.types';

export type RoomStatus = 'waiting' | 'ready_check' | 'playing' | 'finished' | 'paused' | 'ready_check_resume' | 'pause_requested';

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
    isSuddenDeath?: boolean;
    turnDuration?: number;
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