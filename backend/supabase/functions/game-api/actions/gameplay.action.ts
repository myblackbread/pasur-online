import { PlayCardParams, LeaveRoomParams, ReportAfkParams, SuccessResponse, GetMyMaskParams, SendReactionParams } from "../types/api.types.ts";
import { GameError, ErrorCode } from "../utils/errors.ts";
import { getRoomWithSecrets, saveGameTurn, resolveTable, updateRoomComplaint } from "../repositories/room.repo.ts";
import { PasurGame } from "../core/engine.ts";
import { GAME_CONFIG } from "../config/constants.ts";

export async function playCardAction({ db, userId, roomId, cardId, targetCardIds }: PlayCardParams): Promise<SuccessResponse> {
    // Получаем сам стол и его секреты
    const { room, secrets } = await getRoomWithSecrets({ db, roomId });
    // Убеждаемся, что стол в состоянии игры
    if (room.status !== 'playing') throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    // Получаем реальные айдишники игроков
    const realUids = secrets.realUids || {};
    // Находим конкретного игрока
    const publicUid = Object.keys(realUids).find(key => realUids[key] === userId);
    // Проверяем, что игрок вообще сидит за этим столом
    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    // Инициализируем движок игры
    const game = new PasurGame({
        playerIds: room.players.map(p => p.id),
        ruleSet: room.ruleSet,
        skipInit: true,
        isStrict: room.isStrict,
        isSuddenDeath: room.isSuddenDeath,
        isJacksDealerReserved: room.isJacksDealerReserved
    });

    if (secrets.fullGameState) game.state = secrets.fullGameState;

    // Делаем ход 
    game.playCard({ playerId: publicUid, cardId, targetCardIds });

    const extraTime = game.getAnimationDuration();


    if (game.state.matchWinnerTeamId !== null) {
        await resolveTable({ db, roomId, reason: 'match_finished', finalGame: game });
    } else {
        if (game.state.isRoundOver && room.allowPauses) {
            const resetPlayers = room.players.map(p => ({ ...p, isReady: false }));

            await saveGameTurn({
                db, roomId,
                status: 'paused',
                publicState: game.getPublicState(),
                secretState: game.getSecretState(),
                newDeadline: null,
                currentVersion: room.version || 1,
                players: resetPlayers
            });
        } else {
            await saveGameTurn({
                db, roomId,
                status: 'playing',
                publicState: game.getPublicState(),
                secretState: game.getSecretState(),
                newDeadline: Date.now() + GAME_CONFIG.DEFAULT_TURN_DURATION + extraTime,
                currentVersion: room.version || 1
            });
        }
    }

    return { success: true };
}

export async function leaveRoomAction({ db, userId, roomId }: LeaveRoomParams): Promise<SuccessResponse> {

    const { room, secrets } = await getRoomWithSecrets({ db, roomId });
    const realUids = secrets.realUids || {};
    const publicUid = Object.keys(realUids).find(key => realUids[key] === userId);

    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    const leaveReason = ['playing', 'paused'].includes(room.status as string) ? 'surrender' : 'lobby_leave';
    await resolveTable({ db, roomId, reason: leaveReason, targetUserId: publicUid });

    return { success: true };
}

export async function reportAfkAction({ db, userId, roomId }: ReportAfkParams): Promise<SuccessResponse> {

    const { room, secrets } = await getRoomWithSecrets({ db, roomId });
    if (room.status !== 'paused') throw new GameError(ErrorCode.WRONG_ROUND_STATE);

    const realUids = secrets.realUids || {};
    const publicUid = Object.keys(realUids).find(key => realUids[key] === userId);
    if (!publicUid) throw new GameError(ErrorCode.NOT_IN_ROOM);

    const suspectPlayer = room.players.find(p => p.id !== publicUid);
    if (!suspectPlayer) throw new GameError(ErrorCode.TARGET_NOT_FOUND);

    await updateRoomComplaint({
        db, roomId,
        reporterId: userId,
        suspectId: realUids[suspectPlayer.id]
    });

    return { success: true };
}

// ==========================================
// ДОПОЛНИТЕЛЬНЫЕ ЭКШЕНЫ ГЕЙМПЛЕЯ
// ==========================================

export async function getMyMaskAction({ db, userId, roomId }: GetMyMaskParams): Promise<{ mask: string | null }> {
    const { secrets } = await getRoomWithSecrets({ db, roomId });

    const realUids = secrets.realUids || {};
    const publicUid = Object.keys(realUids).find(key => realUids[key] === userId);

    return { mask: publicUid || null };
}

export async function sendReactionAction(params: SendReactionParams): Promise<SuccessResponse> {
    // В будущем здесь можно сохранять реакции в базу или транслировать через Realtime
    return { success: true };
}