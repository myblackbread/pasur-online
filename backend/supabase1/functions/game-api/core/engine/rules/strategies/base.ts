import { GameCard, RoomConfig, TeamId } from "@/shared/models/index.ts";
import { SecretPlayer } from "@/core/engine/models.ts";
import { TeamStats } from "../stats.ts";

export interface GameRulesStrategy {
    calculateScores(params: { 
        players: SecretPlayer[] 
    }): Record<TeamId, TeamStats>;

    checkSuddenDeath(params: { 
        currentScores: Record<TeamId, number>; 
        players: SecretPlayer[]; 
        config: RoomConfig;
    }): TeamId | null;

    validateCapture(params: { 
        cardToPlay: GameCard; 
        targets: GameCard[]; 
        table: GameCard[]; 
        config: RoomConfig;
    }): void;
}