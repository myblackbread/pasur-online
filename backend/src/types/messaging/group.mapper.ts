import type { DbTableInsert, DbTableRow } from "../database.helpers.ts";
import type { SignalMessageType } from "../identity/crypto.ts";
import type {
  GroupMessage,
  GroupParticipant,
  GroupSenderKey,
  ParticipantGroup,
} from "./group.ts";

/**
 * Вспомогательная утилита конвертации Postgres hex (\x...) в Uint8Array.
 * [Алгоритмическое исключение]: принимает прямой позиционный параметр без props.
 */
function hexToBytes(hexString: string): Uint8Array {
  const cleanHex = hexString.startsWith("\\x") ? hexString.slice(2) : hexString;
  const length = cleanHex.length / 2;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Вспомогательная утилита конвертации Uint8Array в Postgres hex (\x...).
 * [Алгоритмическое исключение]: принимает прямой позиционный параметр без props.
 */
function bytesToHex(bytes: Uint8Array): string {
  let hex = "\\x";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export const ParticipantGroupMapper = {
  toDomain(props: { row: DbTableRow<"participant_groups"> }): ParticipantGroup {
    return {
      id: props.row.id,
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { group: ParticipantGroup }): DbTableInsert<"participant_groups"> {
    return {
      id: props.group.id,
      created_at: props.group.createdAt,
    };
  },
};

export const GroupParticipantMapper = {
  toDomain(props: { row: DbTableRow<"group_participants"> }): GroupParticipant {
    return {
      id: props.row.id,
      groupId: props.row.group_id,
      identityId: props.row.identity_id,
    };
  },

  toPersistence(props: {
    participant: GroupParticipant;
  }): DbTableInsert<"group_participants"> {
    return {
      id: props.participant.id,
      group_id: props.participant.groupId,
      identity_id: props.participant.identityId,
    };
  },
};

export const GroupSenderKeyMapper = {
  toDomain(props: { row: DbTableRow<"group_sender_keys"> }): GroupSenderKey {
    return {
      id: props.row.id,
      groupId: props.row.group_id,
      senderIdentityId: props.row.sender_identity_id,
      receiverIdentityId: props.row.receiver_identity_id,
      generation: props.row.generation,
      messageType: props.row.message_type as SignalMessageType,
      encryptedSenderKey: hexToBytes(props.row.encrypted_sender_key),
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { key: GroupSenderKey }): DbTableInsert<"group_sender_keys"> {
    return {
      id: props.key.id,
      group_id: props.key.groupId,
      sender_identity_id: props.key.senderIdentityId,
      receiver_identity_id: props.key.receiverIdentityId,
      generation: props.key.generation,
      message_type: props.key.messageType,
      encrypted_sender_key: bytesToHex(props.key.encryptedSenderKey),
      created_at: props.key.createdAt,
    };
  },
};

export const GroupMessageMapper = {
  toDomain(props: { row: DbTableRow<"group_messages"> }): GroupMessage {
    return {
      id: props.row.id,
      groupId: props.row.group_id,
      clientMessageId: props.row.client_message_id,
      senderIdentityId: props.row.sender_identity_id,
      sequenceIteration: props.row.sequence_iteration,
      encryptedPayload: hexToBytes(props.row.encrypted_payload),
      createdAt: props.row.created_at,
    };
  },

  toPersistence(props: { message: GroupMessage }): DbTableInsert<"group_messages"> {
    return {
      id: props.message.id,
      group_id: props.message.groupId,
      client_message_id: props.message.clientMessageId,
      sender_identity_id: props.message.senderIdentityId,
      sequence_iteration: props.message.sequenceIteration,
      encrypted_payload: bytesToHex(props.message.encryptedPayload),
      created_at: props.message.createdAt,
    };
  },
};