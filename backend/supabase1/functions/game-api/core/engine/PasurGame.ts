import {
    GameCard,
    RoomConfig,
    AnimationCommand,
    GameState,
    TeamId
} from "@/shared/index.ts";

import { FullGameState, SecretPlayer } from '@/core/engine/models.ts';

import { createShuffledDeck } from './deck.ts';
import { GameError, ErrorCode } from "@/shared/errors.ts";
import { GAME_CONFIG } from "@/shared/constants.ts";
import { GameRulesStrategy, ClassicRules, LocalRules } from "../engine/rules/index.ts";
import { SERVER_CONFIG } from "@/core/server_constants.ts";

export class PasurGame {
    public config: RoomConfig;
    public state: FullGameState;

    // Подключаем интерфейс стратегии правил
    private rules: GameRulesStrategy;

    private constructor({ config, state }: { config: RoomConfig, state: FullGameState }) {
        this.config = config;
        this.state = state;

        // Инициализируем нужный свод правил в зависимости от конфига комнаты
        this.rules = this.config.ruleSet === 'classic' ? new ClassicRules() : new LocalRules();
    }

    public static restore({ config, state }: { config: RoomConfig, state: FullGameState }): PasurGame {
        return new PasurGame({ config, state });
    }

    public static createNew({ config, playerIds }: { config: RoomConfig, playerIds: string[] }): PasurGame {
        const initialState: FullGameState = {
            deck: [],
            table: [],
            players: playerIds.map((playerId, index) => ({
                playerId,
                teamId: (index % 2) as TeamId,
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

        const game = new PasurGame({ config, state: initialState });
        game.startNewRound({ shuffledDeck: createShuffledDeck() });
        return game;
    }

    public getPublicState(): GameState {
        return {
            deckCount: this.state.deck.length,
            table: this.state.table,
            players: this.state.players.map((p: SecretPlayer) => {
                const { hand, captured, ...rest } = p;
                return { ...rest, handCount: hand.length, capturedCount: captured.length };
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

    public getSecretState(): FullGameState {
        return this.state;
    }

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

        const { revealedCards, wasDeckReshuffled } = this.setupTable();

        for (const card of revealedCards) {
            animCommands.push({
                cardId: card.id,
                action: 'deal_table',
                source: 'deck',
                target: 'table',
                delay: currentDelay,
                duration: GAME_CONFIG.ANIMATION.DURATION.DEAL_TABLE
            });
            currentDelay += GAME_CONFIG.ANIMATION.DELAY.BETWEEN_DEALS;
        }

        if (wasDeckReshuffled) {
            const shuffleDelay = GAME_CONFIG.ANIMATION.DELAY.SHUFFLE_RETURN;
            currentDelay += shuffleDelay;
        }

        this.dealCards({ animCommands, startDelay: currentDelay });

        const totalDuration = animCommands.length > 0
            ? Math.max(...animCommands.map(c => c.delay + c.duration))
            : 0;

        this.state.animationTrack = {
            id: crypto.randomUUID(),
            lockedUntil: Date.now() + totalDuration - SERVER_CONFIG.ANIMATION_GRACE_PERIOD_MS,
            commands: animCommands
        };
    }

    private setupTable(): { revealedCards: GameCard[], wasDeckReshuffled: boolean } {
        const revealedCards: GameCard[] = [];
        const cardsToReturnToDeck: GameCard[] = [];
        const jacksToReserve: GameCard[] = [];

        const reserveJacks = this.config.ruleSet === 'local' && this.config.isJacksDealerReserved;

        while (this.state.table.length < 4 && this.state.deck.length > 0) {
            const card = this.state.deck.pop()!;

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
            revealedCards.push(card);
        }

        const wasDeckReshuffled = cardsToReturnToDeck.length > 0 || jacksToReserve.length > 0;

        if (wasDeckReshuffled) {
            // Честно перетасовываем колоду нашей безопасной функцией
            this.state.deck = createShuffledDeck([...this.state.deck, ...cardsToReturnToDeck]);

            // Если по правилам нужно придержать валетов дилеру, вставляем их ПОСЛЕ тасовки,
            // чтобы они гарантированно легли куда нужно и не размешались.
            if (jacksToReserve.length > 0) {
                const targetDeckLength = this.state.deck.length + jacksToReserve.length;
                const cardsDealtFirstRound = this.state.players.length * 4;
                const dealerStartIndex = Math.max(0, targetDeckLength - cardsDealtFirstRound);

                this.state.deck.splice(dealerStartIndex, 0, ...jacksToReserve);
            }
        }


        return { revealedCards, wasDeckReshuffled };
    }

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
                            target: { playerId: targetPlayer.playerId },
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

        const playerIndex = this.state.players.findIndex(p => p.playerId === playerId);
        if (playerIndex !== this.state.currentTurnIndex) throw new GameError(ErrorCode.NOT_YOUR_TURN);

        const player = this.state.players[playerIndex];
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) throw new GameError(ErrorCode.INVALID_MOVE);

        const targets = this.state.table.filter(c => targetCardIds.includes(c.id));
        if (targets.length !== targetCardIds.length) throw new GameError(ErrorCode.INVALID_MOVE);

        const cardToPlay = player.hand[cardIndex];

        // 💥 ВОТ ОНО! Делегируем всю сложную валидацию классу правил
        this.rules.validateCapture({ cardToPlay, targets, table: this.state.table, config: this.config });

        const animCommands: AnimationCommand[] = [];

        animCommands.push({
            cardId: cardToPlay.id,
            action: 'play',
            source: { playerId },
            target: 'table',
            delay: 0,
            duration: GAME_CONFIG.ANIMATION.DURATION.PLAY
        });

        player.hand.splice(cardIndex, 1);

        if (targets.length > 0) {
            this.state.lastCapturerPlayerId = playerId;

            const cardsToCapture = [cardToPlay, ...targets];

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

            // Проверка на Сур (тоже можно было унести в правила, но оставим здесь для простоты анимаций)
            if (this.config.ruleSet === 'classic' && this.state.table.length === 0 && cardToPlay.rank !== 'J' && (this.state.deck.length > 0 || this.state.players.some(p => p.hand.length > 0))) {
                player.surs++;
            }
        } else {
            this.state.table.push(cardToPlay);
        }

        this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % this.state.players.length;

        // 💥 Вызов проверки Sudden Death через класс правил
        const suddenDeathWinner = this.rules.checkSuddenDeath({
            currentScores: this.state.matchScores,
            players: this.state.players,
            config: this.config
        });

        if (suddenDeathWinner !== null) {
            this.state.isRoundOver = true;
            this.state.matchWinnerTeamId = suddenDeathWinner;
        }

        let endDelay = targets.length > 0
            ? GAME_CONFIG.ANIMATION.DELAY.BEFORE_CAPTURE + GAME_CONFIG.ANIMATION.DURATION.CAPTURE
            : GAME_CONFIG.ANIMATION.DURATION.PLAY;

        if (this.state.matchWinnerTeamId === null && this.state.players.every(p => p.hand.length === 0)) {
            if (this.state.deck.length > 0) {
                this.dealCards({ animCommands, startDelay: endDelay + GAME_CONFIG.ANIMATION.DELAY.THINKING_PAUSE });
            } else {
                endDelay = this.endRound({ animCommands, startDelay: endDelay + GAME_CONFIG.ANIMATION.DELAY.THINKING_PAUSE });
            }
        }

        const totalDuration = animCommands.length > 0 
            ? Math.max(...animCommands.map(c => c.delay + c.duration)) 
            : 0;

        this.state.animationTrack = {
            id: crypto.randomUUID(),
            lockedUntil: Date.now() + totalDuration - SERVER_CONFIG.ANIMATION_GRACE_PERIOD_MS,
            commands: animCommands
        };
    }

    public getAnimationDuration(): number {
        if (!this.state.animationTrack || this.state.animationTrack.commands.length === 0) {
            return 0;
        }
        return Math.max(...this.state.animationTrack.commands.map(c => c.delay + c.duration));
    }

    private endRound({ animCommands = [], startDelay = 0 }: { animCommands?: AnimationCommand[], startDelay?: number }): number {
        this.state.isRoundOver = true;
        let currentDelay = startDelay;

        if (this.state.table.length > 0) {
            const firstPlayerIdx = this.state.roundNumber % this.state.players.length;
            const dealerIdx = (firstPlayerIdx - 1 + this.state.players.length) % this.state.players.length;

            const targetPlayerId = this.state.lastCapturerPlayerId || this.state.players[dealerIdx].playerId;
            const targetPlayer = this.state.players.find(p => p.playerId === targetPlayerId);

            if (targetPlayer) {
                const leftoverCards = [...this.state.table];
                targetPlayer.captured.push(...leftoverCards);

                for (const c of leftoverCards) {
                    animCommands.push({
                        cardId: c.id,
                        action: 'sweep',
                        source: 'table',
                        target: { playerId: targetPlayerId },
                        delay: currentDelay,
                        duration: GAME_CONFIG.ANIMATION.DURATION.SWEEP
                    });
                }
                currentDelay += GAME_CONFIG.ANIMATION.DELAY.SWEEP_WAIT;
            }
            this.state.table = [];
        }

        // 💥 Делегируем подсчет очков классу правил
        const stats = this.rules.calculateScores({ players: this.state.players });

        if (stats[0]) this.state.matchScores[0] += stats[0].score;
        if (stats[1]) this.state.matchScores[1] += stats[1].score;

        const score0 = this.state.matchScores[0];
        const score1 = this.state.matchScores[1];

        if ((score0 >= GAME_CONFIG.RULES.WINNING_SCORE || score1 >= GAME_CONFIG.RULES.WINNING_SCORE) && score0 !== score1) {
            this.state.matchWinnerTeamId = score0 > score1 ? 0 : 1;
        } else {
            this.state.roundNumber++;
        }

        return currentDelay;
    }
}