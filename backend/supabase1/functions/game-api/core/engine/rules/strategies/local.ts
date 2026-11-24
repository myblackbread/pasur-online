import { GameRulesStrategy } from './base.ts';
import { GameCard, RoomConfig, TeamId } from "@/shared/models/index.ts";
import { SecretPlayer } from "@/core/engine/models.ts";
import { GAME_CONFIG } from '@/shared/constants.ts';
import { getBaseStats, TeamStats } from '../stats.ts';
import { validateCaptureLogic } from '../validator.ts';

export class LocalRules implements GameRulesStrategy {
    public calculateScores({ players }: { players: SecretPlayer[] }): Record<number, TeamStats> {
        const stats = getBaseStats({ players });
        const SC = GAME_CONFIG.SCORING.LOCAL;

        if (stats[0].cards > stats[1].cards) stats[0].score += SC.MOST_CARDS;
        else if (stats[1].cards > stats[0].cards) stats[1].score += SC.MOST_CARDS;

        if (stats[0].clubs > stats[1].clubs) stats[0].score += SC.MOST_CLUBS;
        else if (stats[1].clubs > stats[0].clubs) stats[1].score += SC.MOST_CLUBS;

        if (stats[0].has10D) stats[0].score += SC.TEN_OF_DIAMONDS;
        if (stats[1].has10D) stats[1].score += SC.TEN_OF_DIAMONDS;

        if (stats[0].has2C) stats[0].score += SC.TWO_OF_CLUBS;
        if (stats[1].has2C) stats[1].score += SC.TWO_OF_CLUBS;

        return stats;
    }

    public checkSuddenDeath({
        currentScores,
        players,
        config
    }: {
        currentScores: Record<number, number>,
        players: SecretPlayer[],
        config: RoomConfig
    }): TeamId | null {
        // ИСПРАВЛЕНИЕ 2: Проверяем флаг конфига
        if (!config.isSuddenDeath) return null;

        const stats = getBaseStats({ players });
        const SC = GAME_CONFIG.SCORING.LOCAL;
        
        let s0 = currentScores[0];
        let s1 = currentScores[1];

        if (stats[0].cards >= 27) s0 += SC.MOST_CARDS;
        else if (stats[1].cards >= 27) s1 += SC.MOST_CARDS;

        if (stats[0].clubs >= 7) s0 += SC.MOST_CLUBS;
        else if (stats[1].clubs >= 7) s1 += SC.MOST_CLUBS;

        if (stats[0].has10D) s0 += SC.TEN_OF_DIAMONDS;
        if (stats[1].has10D) s1 += SC.TEN_OF_DIAMONDS;

        if (stats[0].has2C) s0 += SC.TWO_OF_CLUBS;
        if (stats[1].has2C) s1 += SC.TWO_OF_CLUBS;

        const winScore = GAME_CONFIG.RULES.WINNING_SCORE;
        if (s0 >= winScore || s1 >= winScore) {
            return s0 >= winScore ? 0 : 1;
        }

        return null;
    }

    public validateCapture({
        cardToPlay,
        targets,
        table,
        config 
    }: {
        cardToPlay: GameCard,
        targets: GameCard[],
        table: GameCard[],
        config: RoomConfig
    }): void {
        validateCaptureLogic({
            cardToPlay,
            targets,
            table,
            enforceStrict: true // временно
        });
    }
}