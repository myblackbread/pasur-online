import { GameCard, Player, RuleSet, PublicGameState, FullGameState, GameAction } from '../types/models.types.ts';
import { createShuffledDeck } from './deck.ts';
import { isValidPartition, canCaptureAny, calculateRoundScores } from './rules.ts';
import { GameError, ErrorCode } from '../utils/errors.ts';
import { getCardValue } from '../utils/helpers.ts';

export class PasurGame {
    public state: FullGameState;
    public lastCapturerTeamId: number | null = null;

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
        this.state = {
            ruleSet,
            isStrict,
            isSuddenDeath,
            isJacksDealerReserved,
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
            lastAction: null,
        };

        if (!skipInit) {
            this.startNewRound({ shuffledDeck: preShuffledDeck || createShuffledDeck() });
        }
    }

    public getPublicState(): PublicGameState {
        return {
            ruleSet: this.state.ruleSet,
            isStrict: this.state.isStrict,
            isSuddenDeath: this.state.isSuddenDeath,
            isJacksDealerReserved: this.state.isJacksDealerReserved,
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
            lastAction: this.state.lastAction,
            lastCapturerTeamId: this.lastCapturerTeamId,
        };
    }

    public getSecretState(): FullGameState {
        return this.state;
    }

    public startNewRound({ shuffledDeck }: { shuffledDeck: GameCard[] }) {
        this.state.isRoundOver = false;
        this.state.deck = shuffledDeck;
        this.state.table = [];
        this.lastCapturerTeamId = null;
        this.state.lastAction = null;

        this.state.players.forEach(p => { p.hand = []; p.captured = []; p.surs = 0; });
        this.state.currentTurnIndex = this.state.roundNumber % this.state.players.length;

        this.setupTable();
        this.dealCards();
    }

    private setupTable(): GameCard[] {
        const revealedCards: GameCard[] = [];
        const cardsToReturnToDeck: GameCard[] = [];
        const jacksToReserve: GameCard[] = [];

        const reserveJacks = this.state.ruleSet === 'local' && this.state.isJacksDealerReserved;

        while (this.state.table.length < 4 && this.state.deck.length > 0) {
            const card = this.state.deck.pop()!;

            revealedCards.push(card);

            if (card.rank === 'J') {
                if (reserveJacks) {
                    jacksToReserve.push(card);
                } else {
                    cardsToReturnToDeck.push(card);
                }
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

        // 1. Сначала замешиваем все отбракованные карты (кроме зарезервированных валетов) с остатком колоды
        const finalDeck = createShuffledDeck([...this.state.deck, ...cardsToReturnToDeck]);

        // 2. Если есть валеты для дилера, внедряем их на нужные индексы
        if (jacksToReserve.length > 0) {
            const targetDeckLength = finalDeck.length + jacksToReserve.length;
            const cardsDealtFirstRound = this.state.players.length * 4;

            // Высчитываем индекс, с которого начинаются карты дилера
            const dealerStartIndex = Math.max(0, targetDeckLength - cardsDealtFirstRound);

            // Врезаем валеты прямо перед началом "зоны дилера"
            finalDeck.splice(dealerStartIndex, 0, ...jacksToReserve);
        }

        this.state.deck = finalDeck;
        return revealedCards;
    }

    public dealCards() {
        if (this.state.deck.length === 0) return;

        for (let offset = 0; offset < this.state.players.length; offset++) {
            const targetIdx = (this.state.currentTurnIndex + offset) % this.state.players.length;

            while (this.state.players[targetIdx].hand.length < 4) {
                if (this.state.deck.length > 0) {
                    this.state.players[targetIdx].hand.push(this.state.deck.pop()!);
                } else {
                    break;
                }
            }
        }
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

        const playerIndex = this.state.players.findIndex(p => p.id === playerId);
        if (playerIndex !== this.state.currentTurnIndex) throw new GameError(ErrorCode.NOT_YOUR_TURN);

        const player = this.state.players[playerIndex];
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) throw new GameError(ErrorCode.INVALID_MOVE);

        let targets = this.state.table.filter(c => targetCardIds.includes(c.id));
        if (targets.length !== targetCardIds.length) throw new GameError(ErrorCode.INVALID_MOVE);

        const cardToPlay = player.hand[cardIndex];

        if (this.state.isStrict && cardToPlay.rank === 'J') {
            const validJackTargets = this.state.table.filter(c => c.rank !== 'Q' && c.rank !== 'K');
            if (validJackTargets.length > 0) targets = validJackTargets;
        }

        if (targets.length === 0 && this.state.isStrict && canCaptureAny(cardToPlay, this.state.table)) {
            throw new GameError(ErrorCode.INVALID_MOVE);
        }

        const capturedCardsClone = [...targets];

        if (targets.length > 0) {
            if (cardToPlay.rank === 'J') {
                if (targets.some(c => c.rank === 'Q' || c.rank === 'K')) throw new GameError(ErrorCode.INVALID_MOVE);
            } else if (cardToPlay.rank === 'Q' || cardToPlay.rank === 'K') {
                if (targets.length !== 1 || targets[0].rank !== cardToPlay.rank) throw new GameError(ErrorCode.INVALID_MOVE);
            } else {
                if (targets.some(c => getCardValue(c.rank) === 0)) throw new GameError(ErrorCode.INVALID_MOVE);
                if (!isValidPartition(11 - getCardValue(cardToPlay.rank), targets)) throw new GameError(ErrorCode.INVALID_MOVE);
            }
        }

        this.state.lastAction = { playerId, playedCard: cardToPlay, capturedCards: capturedCardsClone, timestamp: Date.now() };

        player.hand.splice(cardIndex, 1);

        if (targets.length > 0) {
            player.captured.push(cardToPlay, ...targets);
            this.state.table = this.state.table.filter(c => !targets.some(t => t.id === c.id));
            this.lastCapturerTeamId = player.teamId;

            if (this.state.ruleSet === 'classic' && this.state.table.length === 0 && cardToPlay.rank !== 'J' && (this.state.deck.length > 0 || this.state.players.some(p => p.hand.length > 0))) {
                player.surs++;
            }
        } else {
            this.state.table.push(cardToPlay);
        }

        this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % this.state.players.length;

        this.checkSuddenDeath();

        if (this.state.matchWinnerTeamId === null && this.state.players.every(p => p.hand.length === 0)) {
            if (this.state.deck.length > 0) this.dealCards();
            else this.endRound();
        }
    }

    private checkSuddenDeath() {
        if (this.state.ruleSet !== 'local' || !this.state.isSuddenDeath) return;

        const stats = calculateRoundScores(this.state.players, this.state.ruleSet);
        const score0 = this.state.matchScores[0] + stats[0].score;
        const score1 = this.state.matchScores[1] + stats[1].score;

        if (score0 >= 11 || score1 >= 11) {
            this.state.isRoundOver = true;
            this.state.matchWinnerTeamId = score0 >= 11 ? 0 : 1;
        }
    }

    private endRound() {
        this.state.isRoundOver = true;

        if (this.state.table.length > 0 && this.lastCapturerTeamId !== null) {
            const lastCapturer = this.state.players.find(p => p.teamId === this.lastCapturerTeamId);
            if (lastCapturer) lastCapturer.captured.push(...this.state.table);
            this.state.table = [];
        }

        const stats = calculateRoundScores(this.state.players, this.state.ruleSet);

        if (stats[0]) this.state.matchScores[0] += stats[0].score;
        if (stats[1]) this.state.matchScores[1] += stats[1].score;

        const score0 = this.state.matchScores[0];
        const score1 = this.state.matchScores[1];

        if ((score0 >= 11 || score1 >= 11) && score0 !== score1) {
            this.state.matchWinnerTeamId = score0 > score1 ? 0 : 1;
        } else {
            this.state.roundNumber++;
        }
    }
}