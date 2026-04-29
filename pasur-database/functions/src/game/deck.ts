import { Card, Suit, Rank } from './types';

export function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function createShuffledDeck(roundNumber: number): Card[] {
    const deck: Card[] = [];
    const suits: Suit[] = ['♠', '♥', '♦', '♣'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    let idCounter = 0;
    for (const suit of suits) {
        for (const rank of ranks) {
            let value = parseInt(rank, 10);
            if (rank === 'A') value = 1;
            if (['J', 'Q', 'K'].includes(rank)) value = 0;
            deck.push({ 
                id: `card_${idCounter++}_r${roundNumber}`, 
                suit, rank, value, str: `${rank}${suit}` 
            });
        }
    }
    return shuffleArray(deck);
}