import { SecretPlayer } from "@/core/engine/models.ts";
import { TeamId } from "@/shared/models.ts";

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

export function getBaseStats({ players }: { players: SecretPlayer[] }): Record<TeamId, TeamStats> {
    const getStats = (teamId: TeamId): TeamStats => {
        const teamPlayers = players.filter(p => p.teamId === teamId);
        
        const stats: TeamStats = { score: 0, cards: 0, clubs: 0, has10D: false, has2C: false, aces: 0, jacks: 0, surs: 0 };
        
        stats.surs = teamPlayers.reduce((sum, p) => sum + p.surs, 0);

        for (const player of teamPlayers) {
            stats.cards += player.captured.length;
            for (const card of player.captured) {
                if (card.suit === '♣') stats.clubs++;
                if (card.rank === '10' && card.suit === '♦') stats.has10D = true;
                if (card.rank === '2' && card.suit === '♣') stats.has2C = true;
                if (card.rank === 'A') stats.aces++;
                if (card.rank === 'J') stats.jacks++;
            }
        }
        return stats;
    };

    return { 0: getStats(0), 1: getStats(1) };
}