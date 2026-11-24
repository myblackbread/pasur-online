import { GameCard } from "@/shared/models.ts";
import { GAME_CONFIG } from "@/shared/constants.ts";
import { getCardValue } from "@/core/helpers.ts";

/**
 * [КЛАССИКА] Проверяет, можно ли разбить массив карт на группы, каждая из которых равна target.
 * Сложность: O(2^N) - используется рекурсия.
 */
// Этот код - бред и он не нужен!
export function isValidPartition({ target, cards }: { target: number, cards: GameCard[] }): boolean {
    const values = cards.map(c => getCardValue(c.rank)).sort((a, b) => b - a);

    const partition = (remaining: number[], currentTarget: number): boolean => {
        if (remaining.length === 0) return currentTarget === 0 || currentTarget === target;
        if (currentTarget === 0) return partition(remaining, target);

        for (let i = 0; i < remaining.length; i++) {
            if (remaining[i] <= currentTarget) {
                const nextRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
                if (partition(nextRemaining, currentTarget - remaining[i])) return true;
            }
        }
        return false;
    };

    return partition(values, target);
}

/**
 * [ЛОКАЛЬНЫЕ] Проверяет, дают ли переданные карты ровно одну нужную сумму.
 */
export function isSingleSum({ target, cards }:{ target: number, cards: GameCard[] }): boolean {
    const totalSum = cards.reduce((sum, card) => sum + getCardValue(card.rank), 0);
    return totalSum === target;
}

/**
 * Ищет на столе ХОТЬ ОДНУ возможность сделать валидную взятку для данной карты.
 * Используется в Strict Mode для запрета сброса карт.
 */
export function canCaptureAny({ card, table }:{ card: GameCard, table: GameCard[] }): boolean {
    if (card.rank === 'J') return table.some(c => c.rank !== 'Q' && c.rank !== 'K');
    if (card.rank === 'Q' || card.rank === 'K') return table.some(c => c.rank === card.rank);
    
    const cardVal = getCardValue(card.rank);
    if (cardVal === 0) return false;

    const targetSum = GAME_CONFIG.RULES.CAPTURE_TARGET_SUM - cardVal;
    const tableNumbers = table.filter(c => getCardValue(c.rank) > 0);

    const checkCombinations = (cards: GameCard[], target: number): boolean => {
        if (target === 0) return true;
        if (target < 0 || cards.length === 0) return false;
        
        for (let i = 0; i < cards.length; i++) {
            const val = getCardValue(cards[i].rank);
            if (checkCombinations(cards.slice(i + 1), target - val)) return true;
        }
        return false;
    };

    return checkCombinations(tableNumbers, targetSum);
}