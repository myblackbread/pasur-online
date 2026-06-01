import { GAME_CONFIG } from "../config/constants.ts";
import { GameCard, RuleSet, TeamStats, Player } from '../types/models.types.ts';
import { getCardValue } from '../utils/helpers.ts';

/**
 * Проверяет, может ли массив карт дать в сумме ровно target.
 * Алгоритм поиска подмножеств (Subset Sum).
 */
export function isValidPartition({ target, cards }: { target: number, cards: GameCard[] }): boolean {
    if (cards.length === 0) return true;

    const totalSum = cards.reduce((sum, c) => sum + getCardValue(c.rank), 0);
    if (totalSum % target !== 0) return false;

    const findSubset = (currentSum: number, startIdx: number, usedIndices: Set<number>): number[] | null => {
        if (currentSum === target) return Array.from(usedIndices);
        if (currentSum > target) return null;

        for (let i = startIdx; i < cards.length; i++) {
            if (!usedIndices.has(i)) {
                usedIndices.add(i);
                const result = findSubset(currentSum + getCardValue(cards[i].rank), i + 1, usedIndices);
                if (result) return result;
                usedIndices.delete(i);
            }
        }
        return null;
    };

    const subset = findSubset(0, 0, new Set());
    if (!subset) return false;

    const remainingCards = cards.filter((_, idx) => !subset.includes(idx));
    return remainingCards.length === 0 ? true : isValidPartition({ target, cards: remainingCards });
}

/**
 * Проверяет, существует ли вообще на столе комбинация, которую можно забрать картой.
 * Используется для Строгого Режима (когда нельзя просто скинуть карту).
 */
export function canCaptureAny({ card, table }: { card: GameCard, table: GameCard[] }): boolean {
    if (table.length === 0) return false;

    if (card.rank === 'Q' || card.rank === 'K') {
        return table.some(c => c.rank === card.rank);
    }
    if (card.rank === 'J') {
        return table.some(c => c.rank !== 'Q' && c.rank !== 'K');
    }

    const target = GAME_CONFIG.RULES.CAPTURE_TARGET_SUM - getCardValue(card.rank);
    const validCards = table.filter(c => getCardValue(c.rank) > 0);

    const hasSubsetSum = (cards: GameCard[], targetSum: number): boolean => {
        if (targetSum === 0) return true;
        if (targetSum < 0 || cards.length === 0) return false;
        if (hasSubsetSum(cards.slice(1), targetSum - getCardValue(cards[0].rank))) return true;
        if (hasSubsetSum(cards.slice(1), targetSum)) return true;
        return false;
    };

    return hasSubsetSum(validCards, target);
}

/**
 * Вычисляет статистику и очки за раунд на основе забранных карт.
 */
export function calculateRoundScores({ players, ruleSet }: { players: Player[], ruleSet: RuleSet }): Record<number, TeamStats> {
    const getTeamStats = (teamId: number): TeamStats => {
        const teamPlayers = players.filter(p => p.teamId === teamId);
        const allCaptured = teamPlayers.flatMap(p => p.captured);
        const totalSurs = teamPlayers.reduce((sum, p) => sum + p.surs, 0);

        return {
            score: 0,
            cards: allCaptured.length,
            clubs: allCaptured.filter(c => c.suit === '♣').length,
            has10D: allCaptured.some(c => c.rank === '10' && c.suit === '♦'),
            has2C: allCaptured.some(c => c.rank === '2' && c.suit === '♣'),
            aces: allCaptured.filter(c => c.rank === 'A').length,
            jacks: allCaptured.filter(c => c.rank === 'J').length,
            surs: totalSurs
        };
    };

    const t0 = getTeamStats(0);
    const t1 = getTeamStats(1);

    const SC = GAME_CONFIG.SCORING;

    switch (ruleSet) {
        case 'local':
            if (t0.cards > t1.cards) t0.score += SC.LOCAL.MOST_CARDS; else if (t1.cards > t0.cards) t1.score += SC.LOCAL.MOST_CARDS;
            if (t0.clubs > t1.clubs) t0.score += SC.LOCAL.MOST_CLUBS; else if (t1.clubs > t0.clubs) t1.score += SC.LOCAL.MOST_CLUBS;
            if (t0.has10D) t0.score += SC.LOCAL.TEN_OF_DIAMONDS; else if (t1.has10D) t1.score += SC.LOCAL.TEN_OF_DIAMONDS;
            if (t0.has2C) t0.score += SC.LOCAL.TWO_OF_CLUBS; else if (t1.has2C) t1.score += SC.LOCAL.TWO_OF_CLUBS;
            break;
        case 'classic':
            t0.score += t0.surs * SC.CLASSIC.SUR; t1.score += t1.surs * SC.CLASSIC.SUR;
            if (t0.clubs > t1.clubs) t0.score += SC.CLASSIC.MOST_CLUBS; else if (t1.clubs > t0.clubs) t1.score += SC.CLASSIC.MOST_CLUBS;
            if (t0.has10D) t0.score += SC.CLASSIC.TEN_OF_DIAMONDS; else if (t1.has10D) t1.score += SC.CLASSIC.TEN_OF_DIAMONDS;
            if (t0.has2C) t0.score += SC.CLASSIC.TWO_OF_CLUBS; else if (t1.has2C) t1.score += SC.CLASSIC.TWO_OF_CLUBS;
            t0.score += (t0.aces + t0.jacks) * SC.CLASSIC.ACE_OR_JACK;
            t1.score += (t1.aces + t1.jacks) * SC.CLASSIC.ACE_OR_JACK;
            break;
    }

    return { 0: t0, 1: t1 };
}