import { GameCard } from "@/shared/models.ts";
import { GameError, ErrorCode } from '@/shared/errors.ts';
import { GAME_CONFIG } from "@/shared/constants.ts";
import { getCardValue } from "@/core/helpers.ts";
import { isSingleSum, canCaptureAny } from './math.ts';

export function validateCaptureLogic({
    cardToPlay,
    targets,
    table,
    enforceStrict
}: {
    cardToPlay: GameCard,
    targets: GameCard[],
    table: GameCard[],
    enforceStrict: boolean
}): void {

    // Проверка на легальность сброса карты
    if (enforceStrict && targets.length === 0 && canCaptureAny({ card: cardToPlay, table })) {
        throw new GameError(ErrorCode.INVALID_MOVE);
    }

    if (targets.length > 0) {
        switch (cardToPlay.rank) {
            case "J": {
                const validJackTargets = table.filter(c => c.rank !== 'Q' && c.rank !== 'K');
                if (enforceStrict) {
                    if (targets.length !== validJackTargets.length || !targets.every(t => validJackTargets.some(v => v.id === t.id))) {
                        throw new GameError(ErrorCode.INVALID_MOVE);
                    }
                } else {
                    if (targets.some(c => c.rank === 'Q' || c.rank === 'K')) throw new GameError(ErrorCode.INVALID_MOVE);
                }
                break;
            }
            case "Q":
            case "K": {
                if (targets.length !== 1 || targets[0].rank !== cardToPlay.rank) throw new GameError(ErrorCode.INVALID_MOVE);
                break;
            }
            default: {
                if (targets.some(c => getCardValue(c.rank) === 0)) throw new GameError(ErrorCode.INVALID_MOVE);

                const targetSum = GAME_CONFIG.RULES.CAPTURE_TARGET_SUM - getCardValue(cardToPlay.rank);

                const isValidMath = isSingleSum({ target: targetSum, cards: targets });

                if (!isValidMath) throw new GameError(ErrorCode.INVALID_MOVE);
                break;
            }
        }
    }
}