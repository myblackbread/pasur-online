import type { DbTableInsert, DbTableRow, DbTableUpdate } from "../database.helpers.ts";
import type {
  EntityBlock,
  EntityBlockTicket,
  ReviewTicket,
  TicketChatMessage,
  TicketMatch,
} from "./moderation.ts";

export const ReviewTicketMapper = {
  toDomain(props: { row: DbTableRow<"review_tickets"> }): ReviewTicket {
    return {
      id: props.row.id,
      reporterId: props.row.reporter_id,
      targetId: props.row.target_id,
      reason: props.row.reason,
      description: props.row.description,
      status: props.row.status,
      resolutionNotes: props.row.resolution_notes,
      createdAt: props.row.created_at,
      updatedAt: props.row.updated_at,
    };
  },

  toPersistenceInsert(props: { ticket: ReviewTicket }): DbTableInsert<"review_tickets"> {
    return {
      id: props.ticket.id,
      reporter_id: props.ticket.reporterId,
      target_id: props.ticket.targetId,
      reason: props.ticket.reason,
      description: props.ticket.description,
      status: props.ticket.status,
      resolution_notes: props.ticket.resolutionNotes,
      created_at: props.ticket.createdAt,
      updated_at: props.ticket.updatedAt,
    };
  },

  toPersistenceUpdate(props: {
    ticket: Partial<ReviewTicket> & { id: string };
  }): DbTableUpdate<"review_tickets"> {
    return {
      reporter_id: props.ticket.reporterId,
      target_id: props.ticket.targetId,
      reason: props.ticket.reason,
      description: props.ticket.description,
      status: props.ticket.status,
      resolution_notes: props.ticket.resolutionNotes,
      updated_at: props.ticket.updatedAt,
    };
  },
};

export const TicketChatMessageMapper = {
  toDomain(props: { row: DbTableRow<"ticket_chat_messages"> }): TicketChatMessage {
    return {
      id: props.row.id,
      ticketId: props.row.ticket_id,
      authorId: props.row.author_id,
      signedPayload: props.row.signed_payload,
      signature: props.row.signature,
      sentAt: props.row.sent_at,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: {
    message: TicketChatMessage;
  }): DbTableInsert<"ticket_chat_messages"> {
    return {
      id: props.message.id,
      ticket_id: props.message.ticketId,
      author_id: props.message.authorId,
      signed_payload: props.message.signedPayload,
      signature: props.message.signature,
      sent_at: props.message.sentAt,
      created_at: props.message.createdAt,
    };
  },
};

export const EntityBlockMapper = {
  toDomain(props: { row: DbTableRow<"entity_blocks"> }): EntityBlock {
    return {
      id: props.row.id,
      entityId: props.row.entity_id,
      reason: props.row.reason,
      period: props.row.period,
      blockedAt: props.row.blocked_at,
      unblockedAt: props.row.unblocked_at,
    };
  },

  toPersistence(props: { block: EntityBlock }): DbTableInsert<"entity_blocks"> {
    return {
      id: props.block.id,
      entity_id: props.block.entityId,
      reason: props.block.reason,
      period: props.block.period,
      blocked_at: props.block.blockedAt,
      unblocked_at: props.block.unblockedAt,
    };
  },
};

export const TicketMatchMapper = {
  toDomain(props: { row: DbTableRow<"ticket_matches"> }): TicketMatch {
    return {
      ticketId: props.row.ticket_id,
      matchId: props.row.match_id,
    };
  },

  toPersistence(props: { relation: TicketMatch }): DbTableInsert<"ticket_matches"> {
    return {
      ticket_id: props.relation.ticketId,
      match_id: props.relation.matchId,
    };
  },
};

export const EntityBlockTicketMapper = {
  toDomain(props: { row: DbTableRow<"entity_block_tickets"> }): EntityBlockTicket {
    return {
      blockId: props.row.block_id,
      entityId: props.row.entity_id,
      ticketId: props.row.ticket_id,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: {
    link: EntityBlockTicket;
  }): DbTableInsert<"entity_block_tickets"> {
    return {
      block_id: props.link.blockId,
      entity_id: props.link.entityId,
      ticket_id: props.link.ticketId,
      created_at: props.link.createdAt,
    };
  },
};