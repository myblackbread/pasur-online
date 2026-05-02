import { Card, Player, RuleSet, TeamStats } from './types.ts';
import { createShuffledDeck } from './deck.ts';
import { GameError, ErrorCode } from "../errors.ts";

export class PasurGame {
    isStrict: boolean = false;
    isSuddenDeath: boolean = false;
    ruleSet: RuleSet;
    deck: Card[] = [];
    table: Card[] = [];
    players: Player[] = [];
    currentTurnIndex: number = 0;
    lastCapturerTeamId: number | null = null;
    dealerReservedJacks: Card[] = [];
    
    matchScores: { [teamId: number]: number } = { 0: 0, 1: 0 };
    isRoundOver: boolean = false;
    isMatchOver: boolean = false;
    matchWinnerTeamId: number | null = null;
    roundNumber: number = 1;
    
    lastAction: {
        playerId: string;
        playedCard: Card;
        capturedCards: Card[];
        timestamp: number;
    } | null = null;

    constructor(playerIds: string[], ruleSet: RuleSet = 'local', skipInit: boolean = false, preShuffledDeck?: Card[], isStrict: boolean = false, isSuddenDeath: boolean = false) {
        this.ruleSet = ruleSet;
        this.isStrict = isStrict;
        
        this.players = playerIds.map((id, index) => ({
            id,
            teamId: index % 2, 
            hand: [], captured: [], surs: 0 
        }));
        
        if (!skipInit) {
            this.startNewRound(preShuffledDeck || createShuffledDeck(this.roundNumber));
        }
    }

    public getLiveScores(): { [teamId: number]: number } {
        const getTeamScore = (teamId: number) => {
            const teamPlayers = this.players.filter(p => p.teamId === teamId);
            const allCaptured = teamPlayers.flatMap(p => p.captured);
            
            let score = this.matchScores[teamId] || 0;
            
            // В классике очки считаются только в конце (суры не даем в лайве, они сложны)
            // А вот в local очки зачисляются "на лету"
            if (this.ruleSet === 'local') {
                if (allCaptured.length >= 27) score += 2;
                if (allCaptured.filter(c => c.suit === '♣').length >= 7) score += 1;
                if (allCaptured.some(c => c.rank === '10' && c.suit === '♦')) score += 1;
                if (allCaptured.some(c => c.rank === '2' && c.suit === '♣')) score += 1;
            }
            return score;
        };

        return { 0: getTeamScore(0), 1: getTeamScore(1) };
    }

    private checkSuddenDeath() {
        if (this.ruleSet !== 'local'|| !this.isSuddenDeath) return;

        const liveScores = this.getLiveScores();
        const score0 = liveScores[0];
        const score1 = liveScores[1];

        // Мгновенная победа, если счет пробил 11 очков
        if (score0 >= 11 || score1 >= 11) {
            this.isRoundOver = true;
            this.isMatchOver = true;
            this.matchWinnerTeamId = score0 >= 11 ? 0 : 1; 
        }
    }

    public startNewRound(shuffledDeck: Card[]) {
        this.isRoundOver = false;
        this.deck = shuffledDeck;
        this.table = [];
        this.dealerReservedJacks = [];
        this.lastCapturerTeamId = null;
        this.lastAction = null; 

        this.players.forEach(p => { p.hand = []; p.captured = []; p.surs = 0; });
        this.currentTurnIndex = (this.roundNumber - 1) % this.players.length;

        this.setupTable();
        this.dealCards();
    }

    private setupTable() {
        let loopGuard = 0;
        while (this.table.length < 4 && this.deck.length > 0 && loopGuard < 200) {
            loopGuard++;
            const card = this.deck.pop()!;
            if (card.rank === 'J') { this.dealerReservedJacks.push(card); continue; }
            if ((card.rank === '2' && card.suit === '♣') || (card.rank === '10' && card.suit === '♦')) { this.deck.unshift(card); continue; }
            
            const dupIndex = this.table.findIndex(c => c.rank === card.rank);
            if (dupIndex !== -1) {
                if (card.suit === '♣') this.deck.unshift(card);
                else if (this.table[dupIndex].suit === '♣') {
                    this.deck.unshift(this.table[dupIndex]);
                    this.table[dupIndex] = card;
                } else this.deck.unshift(card);
                continue;
            }
            this.table.push(card);
        }
    }

    private canCaptureAny(card: Card, table: Card[]): boolean {
        if (table.length === 0) return false;
        
        if (card.rank === 'Q' || card.rank === 'K') {
            return table.some(c => c.rank === card.rank);
        }
        if (card.rank === 'J') {
            return table.some(c => c.rank !== 'Q' && c.rank !== 'K');
        }
        
        const target = 11 - card.value;
        const validCards = table.filter(c => c.value > 0); 

        const hasSubsetSum = (cards: Card[], targetSum: number): boolean => {
            if (targetSum === 0) return true;
            if (targetSum < 0 || cards.length === 0) return false;
            if (hasSubsetSum(cards.slice(1), targetSum - cards[0].value)) return true;
            if (hasSubsetSum(cards.slice(1), targetSum)) return true;
            return false;
        };

        return hasSubsetSum(validCards, target);
    }

    public dealCards() {
        if (this.deck.length === 0 && this.dealerReservedJacks.length === 0) return;

        for (let offset = 0; offset < this.players.length; offset++) {
            const targetIdx = (this.currentTurnIndex + offset) % this.players.length;
            const isDealer = offset === this.players.length - 1;

            while (this.players[targetIdx].hand.length < 4) {
                if (isDealer && this.dealerReservedJacks.length > 0) {
                    this.players[targetIdx].hand.push(this.dealerReservedJacks.pop()!);
                } else if (this.deck.length > 0) {
                    this.players[targetIdx].hand.push(this.deck.pop()!);
                } else {
                    break;
                }
            }
        }
    }

    private isValidPartition(target: number, cards: Card[]): boolean {
        if (cards.length === 0) return true;
        const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
        if (totalSum % target !== 0) return false;

        const findSubset = (currentSum: number, startIdx: number, usedIndices: Set<number>): number[] | null => {
            if (currentSum === target) return Array.from(usedIndices);
            if (currentSum > target) return null;
            
            for (let i = startIdx; i < cards.length; i++) {
                if (!usedIndices.has(i)) {
                    usedIndices.add(i);
                    const result = findSubset(currentSum + cards[i].value, i + 1, usedIndices);
                    if (result) return result;
                    usedIndices.delete(i);
                }
            }
            return null;
        };

        const subset = findSubset(0, 0, new Set());
        if (!subset) return false;

        const remainingCards = cards.filter((_, idx) => !subset.includes(idx));
        return remainingCards.length === 0 ? true : this.isValidPartition(target, remainingCards);
    }

    public playCard(playerId: string, cardId: string, targetCardIds: string[] = []) {
        if (this.isRoundOver || this.isMatchOver) return;

        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex !== this.currentTurnIndex) throw new GameError(ErrorCode.NOT_YOUR_TURN);

        const player = this.players[playerIndex];
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) throw new GameError(ErrorCode.INVALID_MOVE);

        const targets = this.table.filter(c => targetCardIds.includes(c.id));
        if (targets.length !== targetCardIds.length) throw new GameError(ErrorCode.INVALID_MOVE);

        const cardToPlay = player.hand[cardIndex];

        if (targets.length === 0 && this.isStrict) {
            if (this.canCaptureAny(cardToPlay, this.table)) {
                throw new GameError(ErrorCode.INVALID_MOVE);
            }
        }
        
        const capturedCardsClone = [...targets]; 

        if (targets.length > 0) {
            if (cardToPlay.rank === 'J') {
                if (targets.some(c => c.rank === 'Q' || c.rank === 'K')) throw new GameError(ErrorCode.INVALID_MOVE);
            } else if (cardToPlay.rank === 'Q' || cardToPlay.rank === 'K') {
                if (targets.length !== 1 || targets[0].rank !== cardToPlay.rank) throw new GameError(ErrorCode.INVALID_MOVE);
            } else {
                if (targets.some(c => c.value === 0)) throw new GameError(ErrorCode.INVALID_MOVE);
                if (!this.isValidPartition(11 - cardToPlay.value, targets)) throw new GameError(ErrorCode.INVALID_MOVE);
            }
        }

        this.lastAction = {
            playerId: playerId,
            playedCard: cardToPlay,
            capturedCards: capturedCardsClone,
            timestamp: Date.now()
        };

        player.hand.splice(cardIndex, 1);

        if (targets.length > 0) {
            player.captured.push(cardToPlay, ...targets);
            this.table = this.table.filter(c => !targets.some(t => t.id === c.id));
            this.lastCapturerTeamId = player.teamId;

            if (this.ruleSet === 'classic' && this.table.length === 0 && cardToPlay.rank !== 'J' && (this.deck.length > 0 || this.players.some(p => p.hand.length > 0))) {
                player.surs++;
            }
        } else {
            this.table.push(cardToPlay);
        }

        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;

        // 🟢 Проверяем досрочную победу для режима Local ПЕРЕД окончанием раунда!
        this.checkSuddenDeath();

        if (!this.isMatchOver && this.players.every(p => p.hand.length === 0)) {
            if (this.deck.length > 0) this.dealCards();
            else this.endRound();
        }
    }

    private endRound() {
        this.isRoundOver = true;
        if (this.table.length > 0 && this.lastCapturerTeamId !== null) {
            const lastCapturer = this.players.find(p => p.teamId === this.lastCapturerTeamId);
            if (lastCapturer) lastCapturer.captured.push(...this.table);
            this.table = [];
        }

        const stats = this.calculateRoundScores();
        
        if (stats[0]) this.matchScores[0] += stats[0].score;
        if (stats[1]) this.matchScores[1] += stats[1].score;

        const score0 = this.matchScores[0];
        const score1 = this.matchScores[1];

        if ((score0 >= 11 || score1 >= 11) && score0 !== score1) {
            this.isMatchOver = true;
            this.matchWinnerTeamId = score0 > score1 ? 0 : 1;
        } else {
            this.roundNumber++;
        }
    }

    public calculateRoundScores(): { [teamId: number]: TeamStats } {
        const getTeamStats = (teamId: number): TeamStats => {
            const teamPlayers = this.players.filter(p => p.teamId === teamId);
            const allCaptured = teamPlayers.flatMap(p => p.captured);
            const totalSurs = teamPlayers.reduce((sum, p) => sum + p.surs, 0);

            return {
                score: 0,
                cards: allCaptured.length,
                clubs: allCaptured.filter(c => c.suit === '♣').length,
                has10D: allCaptured.some(c => c.rank === '10' && c.suit === '♦'),
                has2C: allCaptured.some(c => c.rank === '2' && c.suit === '♣'),
                aces: allCaptured.filter(c => c.rank === 'A').length,
                jacks: allCaptured.filter(c => c.rank === 'J').length,
                surs: totalSurs
            };
        };

        const t0 = getTeamStats(0);
        const t1 = getTeamStats(1);

        if (this.ruleSet === 'local') {
            if (t0.cards > t1.cards) t0.score += 2; else if (t1.cards > t0.cards) t1.score += 2;
            if (t0.clubs > t1.clubs) t0.score += 1; else if (t1.clubs > t0.clubs) t1.score += 1;
            if (t0.has10D) t0.score += 1; else if (t1.has10D) t1.score += 1;
            if (t0.has2C) t0.score += 1; else if (t1.has2C) t1.score += 1;
        } else {
            t0.score += t0.surs * 5; t1.score += t1.surs * 5;
            if (t0.clubs > t1.clubs) t0.score += 7; else if (t1.clubs > t0.clubs) t1.score += 7;
            if (t0.has10D) t0.score += 3; else if (t1.has10D) t1.score += 3;
            if (t0.has2C) t0.score += 2; else if (t1.has2C) t1.score += 2;
            t0.score += t0.aces + t0.jacks; t1.score += t1.aces + t1.jacks;
        }

        return { 0: t0, 1: t1 };
    }
}