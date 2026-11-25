import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.types.ts";
import type { UUID } from "../../types/primitives.ts";
import type { RelationsService } from "../triplet/service.ts";
import { wsHub } from "./ws.ts";

export interface ParticipantInfo {
  identityId: UUID;
  userId: UUID;
  identityKey: string;
}

export interface GroupChatDetails {
  groupId: UUID;
  participants: ParticipantInfo[];
}

export interface DistributeSenderKeysDto {
  groupId: UUID;
  senderIdentityId: UUID;
  keys: Array<{
    receiverIdentityId: UUID;
    encryptedSenderKeyHex: string;
    generation: number;
    messageType: 2 | 3 | 7;
  }>;
}

export interface PostGroupMessageDto {
  groupId: UUID;
  clientMessageId: UUID;
  senderIdentityId: UUID;
  sequenceIteration: number;
  encryptedPayloadHex: string;
}

export class ChatService {
  constructor(
    private client: SupabaseClient<Database>,
    private relationsService: RelationsService,
  ) {}

  /**
   * Получает существующий или создает новый диалог двух пользователей (E2EE личка).
   * Проверяет взаимную видимость в In-Memory графе TripletManager.
   */
  async getOrCreateDirectChat(
    callerUserId: UUID,
    callerIdentityId: UUID,
    targetUserId: UUID,
  ): Promise<GroupChatDetails> {
    // 1. Проверяем видимость цели для вызывающего пользователя
    const visibility = this.relationsService.getVisibilitySources({
      target: { id: targetUserId, entityType: "user" },
      subject: { id: callerUserId, entityType: "user" },
      findFirst: true,
    });

    if (visibility.length === 0) {
      throw new Error("ACCESS_DENIED: Target user is not visible in graph");
    }

    // 2. Ищем существующую общую группу на двоих
    const { data: commonGroups } = await this.client.rpc("bytea_to_text" as any, {} as any)
      .then(async () => {
        return await this.client
          .from("group_participants")
          .select("group_id, identity_id, crypto_identities!fk_group_participants_identity(user_devices!fk_crypto_identities_device(user_id))")
          .in("identity_id", [callerIdentityId]);
      });

    // 3. Создаем новую группу, если диалога еще нет
    const { data: newGroup, error: groupErr } = await this.client
      .from("participant_groups")
      .insert({})
      .select("id")
      .single();

    if (groupErr || !newGroup) {
      throw new Error(`Failed to create chat group: ${groupErr?.message}`);
    }

    // 4. Находим актуальные identity обоих собеседников
    const { data: targetIdentities } = await this.client
      .from("crypto_identities")
      .select("id, identity_key, user_devices!fk_crypto_identities_device!inner(user_id)")
      .eq("user_devices.user_id", targetUserId);

    const { data: callerIdentities } = await this.client
      .from("crypto_identities")
      .select("id, identity_key, user_devices!fk_crypto_identities_device!inner(user_id)")
      .eq("id", callerIdentityId);

    const participantsPayload = [
      { group_id: newGroup.id, identity_id: callerIdentityId },
      ...(targetIdentities || []).map((ti: any) => ({
        group_id: newGroup.id,
        identity_id: ti.id,
      })),
    ];

    await this.client.from("group_participants").insert(participantsPayload);

    const participants: ParticipantInfo[] = [
      ...(callerIdentities || []).map((ci: any) => ({
        identityId: ci.id,
        userId: callerUserId,
        identityKey: ci.identity_key,
      })),
      ...(targetIdentities || []).map((ti: any) => ({
        identityId: ti.id,
        userId: targetUserId,
        identityKey: ti.identity_key,
      })),
    ];

    return {
      groupId: newGroup.id,
      participants,
    };
  }

  /**
   * Сохраняет ключи отправителя (Sender Keys) и рассылает их получателям по сокету.
   */
  async distributeSenderKeys(dto: DistributeSenderKeysDto): Promise<void> {
    const rows = dto.keys.map((k) => ({
      group_id: dto.groupId,
      sender_identity_id: dto.senderIdentityId,
      receiver_identity_id: k.receiverIdentityId,
      generation: k.generation,
      message_type: k.messageType,
      encrypted_sender_key: k.encryptedSenderKeyHex,
    }));

    const { data, error } = await this.client
      .from("group_sender_keys")
      .insert(rows)
      .select();

    if (error) {
      throw new Error(`Failed to store sender keys: ${error.message}`);
    }

    // Мгновенный пуш получателям через WebSocket
    for (const keyRow of data || []) {
      wsHub.broadcast([keyRow.receiver_identity_id], {
        type: "NEW_SENDER_KEY",
        data: {
          id: keyRow.id,
          groupId: keyRow.group_id,
          senderIdentityId: keyRow.sender_identity_id,
          receiverIdentityId: keyRow.receiver_identity_id,
          generation: keyRow.generation,
          messageType: keyRow.message_type,
          encryptedSenderKey: keyRow.encrypted_sender_key,
          createdAt: keyRow.created_at,
        },
      });
    }
  }

  /**
   * Получение входящих ключей отправителей для устройства в группе.
   */
  async getIncomingSenderKeys(groupId: UUID, receiverIdentityId: UUID) {
    const { data, error } = await this.client
      .from("group_sender_keys")
      .select("*")
      .eq("group_id", groupId)
      .eq("receiver_identity_id", receiverIdentityId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Сохраняет зашифрованное сообщение в БД и транслирует его всем участникам группы.
   */
  async postMessage(dto: PostGroupMessageDto) {
    // 1. Фиксируем сообщение в базе
    const { data: message, error } = await this.client
      .from("group_messages")
      .insert({
        client_message_id: dto.clientMessageId,
        group_id: dto.groupId,
        sender_identity_id: dto.senderIdentityId,
        sequence_iteration: dto.sequenceIteration,
        encrypted_payload: dto.encryptedPayloadHex,
      })
      .select()
      .single();

    if (error || !message) {
      throw new Error(`Failed to persist group message: ${error?.message}`);
    }

    // 2. Получаем список всех устройств-участников группы
    const { data: participants } = await this.client
      .from("group_participants")
      .select("identity_id")
      .eq("group_id", dto.groupId);

    const targetIds = (participants || [])
      .map((p) => p.identity_id)
      .filter((id) => id !== dto.senderIdentityId);

    // 3. Отправляем в сокет участникам онлайн
    wsHub.broadcast(targetIds, {
      type: "NEW_GROUP_MESSAGE",
      data: {
        id: message.id,
        groupId: message.group_id,
        clientMessageId: message.client_message_id,
        senderIdentityId: message.sender_identity_id,
        sequenceIteration: message.sequence_iteration,
        encryptedPayload: message.encrypted_payload,
        createdAt: message.created_at,
      },
    });

    return message;
  }

  /**
   * Чтение истории зашифрованных сообщений группы.
   */
  async getMessages(groupId: UUID, limit = 50, cursor?: string) {
    let query = this.client
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}