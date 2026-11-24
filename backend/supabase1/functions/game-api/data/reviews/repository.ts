import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/core/database/database.types.ts";
import { FullGameState } from "@/core/engine/models.ts";
import { GameError, ErrorCode } from "@/shared/errors.ts";
import { TicketMapper, ComplaintMapper } from "./mapper.ts";

export async function createReviewTicket({ 
    db, reporterId, suspectId, matchSnapshot 
}: { 
    db: SupabaseClient<Database>, reporterId: string, suspectId: string, matchSnapshot: FullGameState | null 
}): Promise<void> {
    const insertData = TicketMapper.toDbInsert({
        reporterId,
        suspectId,
        matchSnapshot,
        status: 'pending'
    });

    const { error } = await db.from("review_tickets").insert(insertData);

    if (error) {
        console.error(`[ReviewRepo] Failed to create ticket for suspect ${suspectId}:`, error.message);
        throw new GameError(ErrorCode.INTERNAL_SERVER_ERROR);
    }
}

export async function updateRoomComplaint({ 
    db, roomId, reporterId, suspectId 
}: { 
    db: SupabaseClient<Database>, roomId: string, reporterId: string, suspectId: string 
}): Promise<void> {
    await db.from("room_complaints").insert(
        ComplaintMapper.toDbInsert({ roomId, reporterId, suspectId })
    );
}