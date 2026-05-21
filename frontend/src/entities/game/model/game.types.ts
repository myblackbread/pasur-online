export interface Card { id: string; suit: string; rank: string; value: number; str: string; }

export interface PlayerState {
    id: string; teamId: number; hand: Card[]; captured: Card[]; surs: number;
}

export type RuleSet = 'local' | 'classic';

export interface GameState {
    ruleSet: RuleSet;
    isStrict: boolean;
    isSuddenDeath?: boolean;
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