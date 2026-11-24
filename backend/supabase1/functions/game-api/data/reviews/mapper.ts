import { Database } from "@/core/database/database.types.ts";
import { ReviewTicket } from "@/data/reviews/models.ts";
import { FullGameState } from "@/core/engine/models.ts";

type TicketDbRow = Database['public']['Tables']['review_tickets']['Row'];
type TicketDbInsert = Database['public']['Tables']['review_tickets']['Insert'];
type TicketStatus = Database['public']['Enums']['ticket_status'];

type ComplaintDbInsert = Database['public']['Tables']['room_complaints']['Insert'];

export const TicketMapper = {
    toDomain(dbRow: TicketDbRow): ReviewTicket {
        return {
            id: dbRow.id,
            reporterUid: dbRow.reporter_uid,
            suspectUid: dbRow.suspect_uid,
            status: dbRow.status,
            matchSnapshot: dbRow.match_snapshot as unknown as FullGameState | null,
            createdAt: dbRow.created_at
        };
    },

    toDbInsert(data: {
        reporterId: string;
        suspectId: string;
        matchSnapshot: FullGameState | null;
        status?: TicketStatus;
    }): TicketDbInsert {
        return {
            reporter_uid: data.reporterId,
            suspect_uid: data.suspectId,
            match_snapshot: data.matchSnapshot as unknown as string,
            status: data.status || 'pending'
        };
    }
};

export const ComplaintMapper = {
    toDbInsert(data: {
        roomId: string;
        reporterId: string;
        suspectId: string;
    }): ComplaintDbInsert {
        return {
            room_id: data.roomId,
            reporter_uid: data.reporterId,
            suspect_uid: data.suspectId
        };
    }
};