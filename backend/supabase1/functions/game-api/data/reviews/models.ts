import { Database } from "@/core/database/database.types.ts";
import { FullGameState } from "@/core/engine/models.ts";

/** Статус тикета модерации */
export type TicketStatus = Database['public']['Enums']['ticket_status'];

/** Внутриигровая жалоба на игрока */
export interface RoomComplaint {
    id: string;
    roomId: string | null;
    reporterUid: string;
    suspectUid: string;
    createdAt: string;
}

/** Тикет на детальное ревью модераторами */
export interface ReviewTicket {
    id: string;
    reporterUid: string;
    suspectUid: string;
    status: TicketStatus;
    matchSnapshot: FullGameState | null;
    createdAt: string;
}