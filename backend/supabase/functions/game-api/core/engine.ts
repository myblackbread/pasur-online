import { GameCard, RuleSet, PublicGameState, FullGameState, RoomConfig, AnimationCommand } from '../types/models.types.ts';
import { createShuffledDeck } from './deck.ts';
import { isValidPartition, canCaptureAny, calculateRoundScores } from './rules.ts';
import { GameError, ErrorCode } from '../utils/errors.ts';
import { getCardValue } from '../utils/helpers.ts';
import { GAME_CONFIG } from "../config/constants.ts";

export class PasurGame {
    /** Неизменяемые настройки текущей комнаты */
    public config: Pick<RoomConfig, 'ruleSet' | 'isStrict' | 'isSuddenDeath' | 'isJacksDealerReserved'>;
    /** Полное (секретное) состояние со всеми картами */
    public state: FullGameState;

    constructor({
        playerIds,
        ruleSet,
        skipInit = false,
        preShuffledDeck,
        isStrict,
        isSuddenDeath,
        isJacksDealerReserved
    }: {
        playerIds: string[];
        ruleSet: RuleSet;
        skipInit?: boolean;
        preShuffledDeck?: GameCard[],
        isStrict: boolean;
        isSuddenDeath: boolean;
        isJacksDealerReserved: boolean;
    }) {
        // Инициализируем настройки отдельно от стейта
        this.config = {
            ruleSet,
            isStrict,
            isSuddenDeath,
            isJacksDealerReserved
        };

        // Инициализируем пустой стейт
        this.state = {
            deck: [],
            table: [],
            players: playerIds.map((id, index) => ({
                id,
                teamId: index % 2,
                hand: [],
                captured: [],
                surs: 0
            })),
            currentTurnIndex: 0,
            matchScores: { 0: 0, 1: 0 },
            isRoundOver: false,
            matchWinnerTeamId: null,
            roundNumber: 0,
            lastCapturerPlayerId: null,
            animationTrack: null,
        };

        if (!skipInit) {
            this.startNewRound({ shuffledDeck: preShuffledDeck || createShuffledDeck() });
        }
    }

    /**
     * Отдает безопасный слепок игры для трансляции клиентам.
     * Скрывает колоду и реальные карты в руках игроков.
     */
    public getPublicState(): PublicGameState {
        return {
            deckCount: this.state.deck.length,
            table: this.state.table,
            players: this.state.players.map(p => {
                const { hand, ...rest } = p;
                return { ...rest, handCount: hand.length };
            }),
            currentTurnIndex: this.state.currentTurnIndex,
            matchScores: this.state.matchScores,
            isRoundOver: this.state.isRoundOver,
            matchWinnerTeamId: this.state.matchWinnerTeamId,
            roundNumber: this.state.roundNumber,
            lastCapturerPlayerId: this.state.lastCapturerPlayerId,
            animationTrack: this.state.animationTrack,
        };
    }

    /**
     * Отдает полное состояние для сохранения в секретную таблицу базы данных.
     */
    public getSecretState(): FullGameState {
        return this.state;
    }

    /**
     * Инициализирует новый раунд: тасует колоду, сдает на стол и на руки,
     * генерирует единый трек анимации раздачи.
     */
    public startNewRound({ shuffledDeck }: { shuffledDeck: GameCard[] }) {
        this.state.isRoundOver = false;
        this.state.deck = shuffledDeck;
        this.state.table = [];
        this.state.lastCapturerPlayerId = null;
        this.state.animationTrack = null;

        this.state.players.forEach(p => { p.hand = []; p.captured = []; p.surs = 0; });
        this.state.currentTurnIndex = this.state.roundNumber % this.state.players.length;

        const animCommands: AnimationCommand[] = [];
        let currentDelay = 0;

        // 1. Выкладываем 4 карты на центр стола (они открыты, поэтому шлем их ID)
        const revealedCards = this.setupTable();
        for (const card of revealedCards) {
            animCommands.push({
                cardId: card.id,
                action: 'deal_table',
                source: 'deck',
                target: 'table',
                delay: currentDelay,
                duration: GAME_CONFIG.ANIMATION.DURATION.DEAL_TABLE
            });
            currentDelay += GAME_CONFIG.ANIMATION.DELAY.BETWEEN_DEALS; // Каждая следующая вылетает с микро-задержкой (очередь)
        }
        // нет логики и выделенного времени для карт, которые вернутся обратно(после полной раздачи)
        // что однозначно надо будет решить до начала разработки фронта, чтобы не переделывать потом ->

        // 2. Раздаем карты на руки (передаем текущий delay, чтобы анимация не прерывалась)
        this.dealCards({ animCommands, startDelay: currentDelay });

        // -> который тут вполне можно было бы решить

        // 3. Упаковываем все команды в единый трек для фронтенда
        this.state.animationTrack = {
            id: crypto.randomUUID(),
            commands: animCommands
        };
    }

    /**
     * Внутренняя логика: вытаскивает 4 валидные карты на стол.
     * Валеты и запрещенные карты замешиваются обратно в колоду.
     */
    private setupTable(): GameCard[] {
        const revealedCards: GameCard[] = [];
        const cardsToReturnToDeck: GameCard[] = [];
        const jacksToReserve: GameCard[] = [];

        const reserveJacks = this.config.ruleSet === 'local' && this.config.isJacksDealerReserved;

        while (this.state.table.length < 4 && this.state.deck.length > 0) {
            const card = this.state.deck.pop()!;
            revealedCards.push(card);

            if (card.rank === 'J') {
                if (reserveJacks) jacksToReserve.push(card);
                else cardsToReturnToDeck.push(card);
                continue;
            }

            if ((card.rank === '2' && card.suit === '♣') || (card.rank === '10' && card.suit === '♦')) {
                cardsToReturnToDeck.push(card);
                continue;
            }

            const dupIndex = this.state.table.findIndex(c => c.rank === card.rank);
            if (dupIndex !== -1) {
                if (card.suit === '♣') {
                    cardsToReturnToDeck.push(card);
                } else if (this.state.table[dupIndex].suit === '♣') {
                    cardsToReturnToDeck.push(this.state.table[dupIndex]);
                    this.state.table[dupIndex] = card;
                } else {
                    cardsToReturnToDeck.push(card);
                }
                continue;
            }

            this.state.table.push(card);
        }

        const finalDeck = createShuffledDeck([...this.state.deck, ...cardsToReturnToDeck]);

        if (jacksToReserve.length > 0) {
            const targetDeckLength = finalDeck.length + jacksToReserve.length;
            const cardsDealtFirstRound = this.state.players.length * 4;
            const dealerStartIndex = Math.max(0, targetDeckLength - cardsDealtFirstRound);
            finalDeck.splice(dealerStartIndex, 0, ...jacksToReserve);
        }

        this.state.deck = finalDeck;
        return revealedCards;
    }

    /**
     * Внутренняя логика: дораздает игрокам карты до 4-х штук.
     * Может принимать массив команд анимации для вклеивания своих событий.
     */
    public dealCards({ animCommands, startDelay = 0 }: { animCommands?: AnimationCommand[], startDelay?: number }): number {
        if (this.state.deck.length === 0) return startDelay;
        let currentDelay = startDelay;

        for (let offset = 0; offset < this.state.players.length; offset++) {
            const targetIdx = (this.state.currentTurnIndex + offset) % this.state.players.length;
            const targetPlayer = this.state.players[targetIdx];

            while (targetPlayer.hand.length < 4) {
                if (this.state.deck.length > 0) {
                    const card = this.state.deck.pop()!;
                    targetPlayer.hand.push(card);

                    if (animCommands) {
                        animCommands.push({
                            cardId: null,
                            action: 'deal_hand',
                            source: 'deck',
                            target: { playerId: targetPlayer.id },
                            delay: currentDelay,
                            duration: GAME_CONFIG.ANIMATION.DURATION.DEAL_HAND
                        });
                        currentDelay += GAME_CONFIG.ANIMATION.DELAY.BETWEEN_DEALS;
                    }
                } else {
                    break;
                }
            }
        }
        return currentDelay;
    }

    /**
     * Основная логика: обработка хода картой из руки игрока.
     */
    public playCard({
        playerId,
        cardId,
        targetCardIds = []
    }: {
        playerId: string;
        cardId: string;
        targetCardIds: string[]
    }) {
        if (this.state.isRoundOver || this.state.matchWinnerTeamId !== null) return;

        const playerIndex = this.state.players.findIndex(p => p.id === playerId);
        if (playerIndex !== this.state.currentTurnIndex) throw new GameError(ErrorCode.NOT_YOUR_TURN);

        const player = this.state.players[playerIndex];
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) throw new GameError(ErrorCode.INVALID_MOVE);

        let targets = this.state.table.filter(c => targetCardIds.includes(c.id));
        if (targets.length !== targetCardIds.length) throw new GameError(ErrorCode.INVALID_MOVE);

        const cardToPlay = player.hand[cardIndex];

        // Проверки строгого режима
        if (this.config.isStrict && cardToPlay.rank === 'J') {
            const validJackTargets = this.state.table.filter(c => c.rank !== 'Q' && c.rank !== 'K');
            if (validJackTargets.length > 0) targets = validJackTargets;
        }

        if (targets.length === 0 && this.config.isStrict && canCaptureAny({ card: cardToPlay, table: this.state.table })) {
            throw new GameError(ErrorCode.INVALID_MOVE);
        }

        if (targets.length > 0) {
            if (cardToPlay.rank === 'J') {
                if (targets.some(c => c.rank === 'Q' || c.rank === 'K')) throw new GameError(ErrorCode.INVALID_MOVE);
            } else if (cardToPlay.rank === 'Q' || cardToPlay.rank === 'K') {
                if (targets.length !== 1 || targets[0].rank !== cardToPlay.rank) throw new GameError(ErrorCode.INVALID_MOVE);
            } else {
                if (targets.some(c => getCardValue(c.rank) === 0)) throw new GameError(ErrorCode.INVALID_MOVE);
                if (!isValidPartition({ target: GAME_CONFIG.RULES.CAPTURE_TARGET_SUM - getCardValue(cardToPlay.rank), cards: targets })) throw new GameError(ErrorCode.INVALID_MOVE);
            }
        }

        // Подготовка таймлайна для фронтенда
        const animCommands: AnimationCommand[] = [];

        // 1. Анимация броска карты из руки на стол
        animCommands.push({
            cardId: cardToPlay.id,
            action: 'play',
            source: { playerId },
            target: 'table',
            delay: 0,
            duration: GAME_CONFIG.ANIMATION.DURATION.PLAY
        });

        player.hand.splice(cardIndex, 1);

        // 2. Логика взяток и суров
        if (targets.length > 0) {
            this.state.lastCapturerPlayerId = playerId; // Запоминаем, кто забрал последним

            // Забираем сыгранную карту + карты-цели
            const cardsToCapture = [cardToPlay, ...targets];

            // Анимация: все забираемые карты летят в стопку игрока ОДНОВРЕМЕННО (одинаковый delay)
            for (const c of cardsToCapture) {
                animCommands.push({
                    cardId: c.id,
                    action: 'capture',
                    source: 'table',
                    target: { playerId },
                    delay: GAME_CONFIG.ANIMATION.DELAY.BEFORE_CAPTURE,
                    duration: GAME_CONFIG.ANIMATION.DURATION.CAPTURE
                });
            }

            player.captured.push(...cardsToCapture);
            this.state.table = this.state.table.filter(c => !targets.some(t => t.id === c.id));

            // Проверка на СУР (чистый стол)
            if (this.config.ruleSet === 'classic' && this.state.table.length === 0 && cardToPlay.rank !== 'J' && (this.state.deck.length > 0 || this.state.players.some(p => p.hand.length > 0))) {
                player.surs++;
            }
        } else {
            this.state.table.push(cardToPlay);
        }

        // Передача хода
        this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % this.state.players.length;

        // Проверка победы на лету (Sudden Death)
        this.checkSuddenDeath();

        // Склеиваем треки, если руки опустели
        let endDelay = targets.length > 0
            ? GAME_CONFIG.ANIMATION.DELAY.BEFORE_CAPTURE + GAME_CONFIG.ANIMATION.DURATION.CAPTURE
            : GAME_CONFIG.ANIMATION.DURATION.PLAY;

        if (this.state.matchWinnerTeamId === null && this.state.players.every(p => p.hand.length === 0)) {
            if (this.state.deck.length > 0) {
                // Вклеиваем анимацию новой раздачи в конец текущего трека хода
                this.dealCards({ animCommands, startDelay: endDelay + GAME_CONFIG.ANIMATION.DELAY.THINKING_PAUSE });
            } else {
                // Если колода пуста, вклеиваем логику финала раунда (пылесос стола)
                endDelay = this.endRound({ animCommands, startDelay: endDelay + GAME_CONFIG.ANIMATION.DELAY.THINKING_PAUSE });
            }
        }

        this.state.animationTrack = {
            id: crypto.randomUUID(),
            commands: animCommands
        };
    }

    /**
     * Проверка на мгновенную победу (в режиме 'local' при наборе 11 очков до завершения раунда)
     */
    private checkSuddenDeath() {
        if (this.config.ruleSet !== 'local' || !this.config.isSuddenDeath) return;

        const stats = calculateRoundScores({ players: this.state.players, ruleSet: this.config.ruleSet });
        const score0 = this.state.matchScores[0] + stats[0].score;
        const score1 = this.state.matchScores[1] + stats[1].score;

        if (score0 >= GAME_CONFIG.RULES.WINNING_SCORE || score1 >= GAME_CONFIG.RULES.WINNING_SCORE) {
            this.state.isRoundOver = true;
            this.state.matchWinnerTeamId = score0 >= 11 ? 0 : 1;
        }
    }

    /**
     * Возвращает общую продолжительность текущих анимаций (в миллисекундах).
     */
    public getAnimationDuration(): number {
        if (!this.state.animationTrack || this.state.animationTrack.commands.length === 0) {
            return 0;
        }
        return Math.max(...this.state.animationTrack.commands.map(c => c.delay + c.duration));
    }

    /**
     * Внутренняя логика: конец раунда.
     * Отдает остатки со стола последнему забравшему и подсчитывает очки.
     */
    private endRound({ animCommands = [], startDelay = 0 }: { animCommands?: AnimationCommand[], startDelay?: number }): number {
        this.state.isRoundOver = true;
        let currentDelay = startDelay;

        // "Пылесосим" стол: отдаем остатки последнему игроку, взявшему взятку
        if (this.state.table.length > 0 && this.state.lastCapturerPlayerId !== null) {
            const lastCapturer = this.state.players.find(p => p.id === this.state.lastCapturerPlayerId);
            if (lastCapturer) {
                const leftoverCards = [...this.state.table];
                lastCapturer.captured.push(...leftoverCards);

                // Анимация финального забора остатков со стола
                for (const c of leftoverCards) {
                    animCommands.push({
                        cardId: c.id,
                        action: 'sweep',
                        source: 'table',
                        target: { playerId: this.state.lastCapturerPlayerId },
                        delay: currentDelay,
                        duration: GAME_CONFIG.ANIMATION.DURATION.SWEEP
                    });
                }
                currentDelay += GAME_CONFIG.ANIMATION.DELAY.SWEEP_WAIT; // Ждем, пока карты улетят
            }
            this.state.table = [];
        }

        // Подсчет очков
        const stats = calculateRoundScores({ players: this.state.players, ruleSet: this.config.ruleSet });

        if (stats[0]) this.state.matchScores[0] += stats[0].score;
        if (stats[1]) this.state.matchScores[1] += stats[1].score;

        const score0 = this.state.matchScores[0];
        const score1 = this.state.matchScores[1];

        // Определение победителя всего матча
        if ((score0 >= 11 || score1 >= 11) && score0 !== score1) {
            this.state.matchWinnerTeamId = score0 > score1 ? 0 : 1;
        } else {
            this.state.roundNumber++;
        }

        return currentDelay;
    }
}