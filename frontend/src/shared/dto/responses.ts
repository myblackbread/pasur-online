import { Room, GameState, GameCard } from "../models/index";

/** * Базовый ответ об успешном выполнении любого API-экшена.
 */
export interface SuccessResponse {
    success: boolean;
}

/** * Ответ сервера при успешном создании комнаты или присоединении к ней.
 * Содержит данные для идентификации игрока и входа в игровую сессию.
 */
export interface RoomEntryResponse extends SuccessResponse {
    /** Уникальный ID комнаты */
    roomId: string;
    /** Уникальный ID игрока (userId или avatarId) */
    playerId: string;
    /** Код для входа (если комната приватная) */
    joinCode?: string | null;
}

/** * Ответ на запрос поиска доступных игровых комнат.
 * Возвращает список активных комнат в статусе 'waiting'.
 */
export interface SearchRoomsResponse extends SuccessResponse {
    /** Список найденных комнат */
    rooms: Room[];
}

/** * Полный ответ сервера с текущим состоянием игровой сессии.
 * Используется для синхронизации клиента при первом подключении или после долгого отсутствия.
 */
export interface GetGameStateResponse extends SuccessResponse {
    /** Актуальная информация о параметрах комнаты */
    room: Room;
    /** Текущее состояние игры (таблица, колода, счет) */
    state: GameState | null;
    /** Список карт, находящихся на руках у запрашивающего игрока */
    myHand: GameCard[]; 
}

/** * Ответ сервера с "маской" игрока.
 * Возвращает идентификатор (userId или avatarId), который используется 
 * клиентом для подтверждения своей личности в рамках комнаты.
 */
export interface GetMyMaskResponse {
    /** ID игрока за столом (avatarId, если инкогнито, иначе userId) */
    mask: string | null;
}