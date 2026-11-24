import { BaseActionParams } from "@/core/types.ts";
import { SuccessResponse } from "@/shared/dto/responses.ts";
import { GetGameStateResponse, GetMyMaskResponse } from "@/shared/index.ts";
import { GameState, GameCard, Room } from "@/shared/index.ts";
import { GameError, ErrorCode } from "@/shared/errors.ts";
import { GAME_CONFIG } from "@/shared/constants.ts";
import { SERVER_CONFIG } from "@/core/server_constants.ts";
import { PasurGame } from "@/core/engine/PasurGame.ts";
import { 
    getRoomWithSecrets, 
    saveGameTurn, 
    resolveTable, 
    resetAllPlayersReady 
} from "@/data/rooms/repository.ts";
import { updateRoomComplaint } from "@/data/reviews/repository.ts";

// ==========================================
// ⚙️ ПАРАМЕТРЫ ЭКШЕНОВ
// ==========================================

export interface PlayCardParams extends BaseActionParams {
    roomId: string;
    cardId: string;
    targetCardIds: string[];
}

export interface LeaveRoomParams extends BaseActionParams {
    roomId: string;
}

export interface ReportAfkParams extends BaseActionParams {
    roomId: string;
}

export interface GetMyMaskParams extends BaseActionParams {
    roomId: string;
}

export interface SendReactionParams extends BaseActionParams {
    roomId: string;
}

export interface GetGameStateParams extends BaseActionParams {
    roomId: string;
}

// ==========================================
// 🚀 ЛОГИКА ЭКШЕНОВ
// ==========================================

export async function playCardAction({ db, userId, roomId, cardId, targetCardIds }: PlayCardParams): Promise<SuccessResponse> {
    const { room, secrets } = await getRoomWithSecrets({ db, roomId });
    if (room.status !== 'playing') throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    if (secrets.fullGameState?.animationTrack) {
        if (Date.now() < secrets.fullGameState.animationTrack.lockedUntil) {
            throw new GameError(ErrorCode.ANIMATION_IN_PROGRESS);
        }
    }

    const player = room.players.find(p => p.userId === userId);
    if (!player) throw new GameError(ErrorCode.NOT_IN_ROOM);
    
    const playerId = player.avatarId || player.userId;
    if (!playerId) throw new GameError(ErrorCode.NOT_IN_ROOM);

    if (!secrets.fullGameState) throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);

    const game = PasurGame.restore({ config: room, state: secrets.fullGameState });

    game.playCard({ playerId, cardId, targetCardIds });
    const extraTime = game.getAnimationDuration();

    if (game.state.matchWinnerTeamId !== null) {
        await resolveTable({ db, roomId, reason: 'match_finished', finalGame: game });
    } else {
        if (game.state.isRoundOver && room.allowPauses) {
            await saveGameTurn({
                db, roomId,
                status: 'paused',
                secretState: game.getSecretState(),
                newDeadline: null,
                currentVersion: room.version
            });
            await resetAllPlayersReady({ db, roomId });
        } else {
            await saveGameTurn({
                db, roomId,
                status: 'playing',
                secretState: game.getSecretState(),
                newDeadline: Date.now() + room.turnDuration + extraTime + SERVER_CONFIG.NETWORK_TOLERANCE_MS,
                currentVersion: room.version
            });
        }
    }

    return { success: true };
}

export async function leaveRoomAction({ db, userId, roomId }: LeaveRoomParams): Promise<SuccessResponse> {
    const { room } = await getRoomWithSecrets({ db, roomId });
    
    const player = room.players.find(p => p.userId === userId);
    if (!player) throw new GameError(ErrorCode.NOT_IN_ROOM);
    
    const playerId = player.avatarId || player.userId;
    if (!playerId) throw new GameError(ErrorCode.NOT_IN_ROOM);

    const leaveReason = ['playing', 'paused'].includes(room.status as string) ? 'surrender' : 'lobby_leave';
    await resolveTable({ db, roomId, reason: leaveReason, targetUserId: playerId });

    return { success: true };
}

export async function reportAfkAction({ db, userId, roomId }: ReportAfkParams): Promise<SuccessResponse> {
    const { room } = await getRoomWithSecrets({ db, roomId });
    if (room.status !== 'paused') throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    const reporterPlayer = room.players.find(p => p.userId === userId);
    if (!reporterPlayer) throw new GameError(ErrorCode.NOT_IN_ROOM);

    const suspectPlayer = room.players.find(p => p.userId !== userId);
    if (!suspectPlayer || !suspectPlayer.userId) throw new GameError(ErrorCode.TARGET_NOT_FOUND);

    await updateRoomComplaint({
        db, roomId,
        reporterId: userId,
        suspectId: suspectPlayer.userId 
    });

    return { success: true };
}

export async function getMyMaskAction({ db, userId, roomId }: GetMyMaskParams): Promise<GetMyMaskResponse> {
    const { room } = await getRoomWithSecrets({ db, roomId });

    const player = room.players.find(p => p.userId === userId);
    if (!player) return { mask: null };

    return { mask: player.avatarId || player.userId };
}

export async function sendReactionAction(params: SendReactionParams): Promise<SuccessResponse> {
    // TODO: Интеграция с WebSocket/Realtime
    return { success: true };
}

export async function getGameStateAction({ db, userId, roomId }: GetGameStateParams): Promise<GetGameStateResponse> {
    const { room, secrets } = await getRoomWithSecrets({ db, roomId });
    
    const player = room.players.find(p => p.userId === userId);
    if (!player) throw new GameError(ErrorCode.NOT_IN_ROOM);
    const playerId = player.avatarId || player.userId;

    if (!secrets.fullGameState) {
        return { success: true, room, state: null, myHand: [] };
    }

    const state = secrets.fullGameState;
    let myHand: GameCard[] = [];

    const publicPlayers = state.players.map(p => {
        if (p.playerId === playerId) {
            myHand = p.hand;
        }
        
        return {
            playerId: p.playerId,
            teamId: p.teamId,
            handCount: p.hand.length,
            capturedCount: p.captured.length,
            surs: p.surs
        };
    });

    const publicState: GameState = {
        deckCount: state.deck.length,
        table: state.table,
        players: publicPlayers,
        currentTurnIndex: state.currentTurnIndex,
        matchScores: state.matchScores,
        isRoundOver: state.isRoundOver,
        matchWinnerTeamId: state.matchWinnerTeamId,
        roundNumber: state.roundNumber,
        lastCapturerPlayerId: state.lastCapturerPlayerId,
        animationTrack: state.animationTrack,
    };

    return { success: true, room, state: publicState, myHand };
}