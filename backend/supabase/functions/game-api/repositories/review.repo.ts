import { CreateTicketParams } from "../types/api.types.ts";

export async function createReviewTicket({ db, reporterId, suspectId, matchSnapshot }: CreateTicketParams): Promise<void> {

    const { error } = await db.from("review_tickets").insert({
        reporter_uid: reporterId,
        suspect_uid: suspectId,
        match_snapshot: matchSnapshot as any,
        status: 'pending',
        created_at: Date.now()
    });

    if (error) {
        console.error(`[ReviewRepo] Failed to create ticket for suspect ${suspectId}:`, error.message);
    }
}