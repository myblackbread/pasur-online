import { Suit, Rank, GameCard } from '../types/models.types.ts';
import { shuffleArray } from '../utils/helpers.ts';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Перетасовывает переданную колоду. 
 * Если колода не передана, создает новую из 52 уникальных игровых карт и тасует её.
 */
export function createShuffledDeck(existingDeck?: GameCard[]): GameCard[] {
    if (existingDeck) {
        return shuffleArray([...existingDeck]);
    }

    const deck: GameCard[] = SUITS.flatMap(suit => RANKS.map(rank => ({
        id: crypto.randomUUID(), 
        suit,
        rank
    })));
    
    return shuffleArray(deck);
}