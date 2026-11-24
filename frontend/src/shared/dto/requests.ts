import { RoomConfig } from "../models/index";

/** * Данные, которые присылает клиент при создании новой комнаты.
 * Наследует базовые настройки конфигурации комнаты.
 */
export interface CreateRoomPayload extends RoomConfig {
    /** Флаг приватности. Если true, бекенд сгенерирует код входа */
    isPrivate: boolean; 
}

/** * Фильтры для поиска комнат в лобби.
 */
export interface SearchRoomsFilters extends Partial<RoomConfig> {}