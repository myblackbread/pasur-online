export type RuleSet = 'local' | 'classic';
export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card { 
    id: string; 
    suit: Suit; 
    rank: Rank; 
    value: number; 
    str: string; 
}

export interface Player { 
    id: string; 
    teamId: number; 
    hand: Card[]; 
    captured: Card[]; 
    surs: number; 
}

export interface TeamStats {
    score: number;
    cards: number;
    clubs: number;
    has10D: boolean;
    has2C: boolean;
    aces: number;
    jacks: number;
    surs: number;
}