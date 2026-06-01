import { Rank } from "../types/models.types.ts";

const UINT32_MAX = 0xFFFFFFFF;

/**
 * Криптографически безопасная тасовка Фишера-Йетса (Fisher-Yates Shuffle).
 * Использует Deno crypto API для исключения предсказуемости колоды.
 */
export function shuffleArray<T>(array: T[]): T[] {
    const n = array.length;
    const result = [...array];
    
    const randomValues = new Uint32Array(n);
    crypto.getRandomValues(randomValues);

    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor((randomValues[i] / UINT32_MAX) * (i + 1));
        
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    
    return result;
}

/**
 * Возвращает числовой номинал карты для подсчета суммы 11.
 * Туз = 1, Валет/Дама/Король = 0, остальные по номиналу.
 */
export function getCardValue(rank: Rank): number {
    if (rank === 'A') return 1;
    if (['J', 'Q', 'K'].includes(rank)) return 0;
    
    return parseInt(rank, 10);
}

/**
 * Генерирует криптографически безопасный, но удобный для чтения код комнаты.
 * Алфавит ровно 32 символа (убраны 0, 1, I, O), что исключает modulo bias.
 */
export function generateJoinCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const codeLength = 6;
    const randomValues = new Uint8Array(codeLength);
    crypto.getRandomValues(randomValues);

    let result = '';
    for (let i = 0; i < codeLength; i++) {
        result += chars[randomValues[i] % chars.length];
    }

    return `${result.slice(0, 3)}-${result.slice(3, 6)}`;
}