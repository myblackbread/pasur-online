import { GameRulesStrategy } from './base.ts';
import { GameCard, RoomConfig, TeamId } from "@/shared/index.ts";
import { SecretPlayer } from "@/core/engine/models.ts";
import { GAME_CONFIG } from '@/shared/constants.ts';
import { getBaseStats, TeamStats } from '../stats.ts';
import { validateCaptureLogic } from '../validator.ts';

export class ClassicRules implements GameRulesStrategy {
    public calculateScores({ players }: { players: SecretPlayer[] }): Record<number, TeamStats> {
        const stats = getBaseStats({ players });
        const SC = GAME_CONFIG.SCORING.CLASSIC;

        stats[0].score += stats[0].surs * SC.SUR;
        stats[1].score += stats[1].surs * SC.SUR;

        if (stats[0].clubs > stats[1].clubs) stats[0].score += SC.MOST_CLUBS;
        else if (stats[1].clubs > stats[0].clubs) stats[1].score += SC.MOST_CLUBS;

        if (stats[0].has10D) stats[0].score += SC.TEN_OF_DIAMONDS;
        if (stats[1].has10D) stats[1].score += SC.TEN_OF_DIAMONDS;

        if (stats[0].has2C) stats[0].score += SC.TWO_OF_CLUBS;
        if (stats[1].has2C) stats[1].score += SC.TWO_OF_CLUBS;

        stats[0].score += (stats[0].aces + stats[0].jacks) * SC.ACE_OR_JACK;
        stats[1].score += (stats[1].aces + stats[1].jacks) * SC.ACE_OR_JACK;

        return stats;
    }

    public checkSuddenDeath(_params?: any): TeamId | null {
        return null;
    }

    public validateCapture({ cardToPlay, targets, table, config }: { 
        cardToPlay: GameCard; 
        targets: GameCard[]; 
        table: GameCard[]; 
        config: RoomConfig;
    }): void {
        validateCaptureLogic({ 
            cardToPlay, 
            targets, 
            table, 
            enforceStrict: true // Временно
        });
    }
}