import { Rank } from "../shared/index.ts";

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

    return result;
}

/**
 * Генерирует детерминированный UUIDv5 на основе ID юзера и ID стола.
 * Для одной и той же пары (User + Room) всегда возвращает одинаковый UUID.
 */
export async function generateAvatarId({ userId, roomId }: { userId: string, roomId: string }): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + roomId);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Форматируем по стандарту RFC 4122 (Version 5, Variant 10)
    hashArray[6] = (hashArray[6] & 0x0f) | 0x50; 
    hashArray[8] = (hashArray[8] & 0x3f) | 0x80; 
    
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}