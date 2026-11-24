import { Player, GameState, GameCard } from "@/shared/models/index.ts";

/** * Расширенный игрок для бекенда. 
 * Убираем счетчик карт (handCount) и заменяем его на массив реальных карт (hand).
 */
export interface SecretPlayer extends Omit<Player, 'handCount' | 'capturedCount'> {
    hand: GameCard[];
    captured: GameCard[];
}

/** * Полное (секретное) состояние игры. Единый источник истины. 
 */
export interface FullGameState extends Omit<GameState, 'players' | 'deckCount'> {
    deck: GameCard[];
    players: SecretPlayer[];
}

/**
 * Модель секретов комнаты, которая сохраняется в БД.
 */
export interface RoomSecrets {
    roomId: string;
    fullGameState: FullGameState | null;
}