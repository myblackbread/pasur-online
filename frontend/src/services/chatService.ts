import { clientCrypto } from "./clientCrypto";
import { apiClient } from "./apiClient";

export interface DecryptedChatMessage {
  id: string;
  groupId: string;
  senderIdentityId: string;
  text: string;
  createdAt: string;
  isMe: boolean;
}

export interface DirectChatSession {
  groupId: string;
  myIdentityId: string;
  targetIdentityId: string;
  targetUserId: string;
}

export const chatService = {
  /**
   * Инициализирует локальное устройство и регистрирует его на сервере Deno.
   */
  async initDevice(authToken: string): Promise<{ deviceId: string; identityId: string }> {
    apiClient.setAuthToken(authToken);

    const init = await clientCrypto.getOrInitIdentity();
    if (!init.isNew && init.deviceId && init.identityId) {
      return { deviceId: init.deviceId, identityId: init.identityId };
    }

    const reg = await apiClient.registerDevice({
      deviceId: init.deviceId,
      identityKey: init.identityKeyBase64,
      registrationId: init.registrationId,
      signedPrekey: init.identityKeyBase64,
      signedPrekeyId: 1,
      signedPrekeySignature: "local_signature",
    });

    await clientCrypto.saveRegisteredIdentity({
      deviceId: reg.deviceId,
      identityId: reg.identityId,
      registrationId: init.registrationId,
    });

    return reg;
  },

  /**
   * Открывает диалог с пользователем и выполняет обмен Sender Keys при необходимости.
   */
  async openDirectChat(myIdentityId: string, targetUserId: string): Promise<DirectChatSession> {
    const group = await apiClient.getOrCreateDirectChat({
      callerIdentityId: myIdentityId,
      targetUserId,
    });

    const targetParticipant = group.participants.find((p) => p.userId === targetUserId);
    if (!targetParticipant) {
      throw new Error("Target participant identity not found");
    }

    // 1. Проверяем, есть ли наш Sender Key для этой группы, и отправляем его собеседнику
    const mySenderKey = await clientCrypto.getOrCreateMySenderKey(group.groupId, myIdentityId);
    const encryptedKeyHex = await clientCrypto.exportSenderKeyForReceiver(
      mySenderKey,
      targetParticipant.identityKey
    );

    await apiClient.distributeSenderKeys(group.groupId, myIdentityId, [
      {
        receiverIdentityId: targetParticipant.identityId,
        encryptedSenderKeyHex: encryptedKeyHex,
        generation: 1,
        messageType: 7,
      },
    ]);

    // 2. Забираем входящие ключи от собеседника, если они уже есть на сервере
    const incomingKeys = await apiClient.getIncomingSenderKeys(group.groupId, myIdentityId);
    for (const k of incomingKeys) {
      await clientCrypto.importSenderKeyFromSender(
        group.groupId,
        k.sender_identity_id,
        targetParticipant.identityKey,
        k.encrypted_sender_key
      );
    }

    return {
      groupId: group.groupId,
      myIdentityId,
      targetIdentityId: targetParticipant.identityId,
      targetUserId,
    };
  },

  /**
   * Отправка зашифрованного сообщения.
   */
  async sendMessage(session: DirectChatSession, text: string): Promise<DecryptedChatMessage> {
    const clientMessageId = crypto.randomUUID();

    const { encryptedPayloadHex, sequenceIteration } = await clientCrypto.encryptTextMessage(
      text,
      session.groupId,
      session.myIdentityId
    );

    const row = await apiClient.postMessage(session.groupId, {
      clientMessageId,
      senderIdentityId: session.myIdentityId,
      sequenceIteration,
      encryptedPayloadHex,
    });

    return {
      id: row.id,
      groupId: session.groupId,
      senderIdentityId: session.myIdentityId,
      text,
      createdAt: row.created_at,
      isMe: true,
    };
  },

  /**
   * Загрузка истории сообщений с расшифровкой на лету.
   */
  async loadMessages(session: DirectChatSession, limit = 50): Promise<DecryptedChatMessage[]> {
    const rawRows = await apiClient.getMessages(session.groupId, limit);
    const result: DecryptedChatMessage[] = [];

    for (const row of rawRows) {
      const isMe = row.sender_identity_id === session.myIdentityId;
      const text = await clientCrypto.decryptTextMessage(
        row.encrypted_payload,
        session.groupId,
        row.sender_identity_id
      );

      result.push({
        id: row.id,
        groupId: row.group_id,
        senderIdentityId: row.sender_identity_id,
        text,
        createdAt: row.created_at,
        isMe,
      });
    }

    return result;
  },

  /**
   * Подписка на Realtime WebSocket события.
   */
  subscribeToChat(
    session: DirectChatSession,
    onNewMessage: (msg: DecryptedChatMessage) => void
  ): () => void {
    return apiClient.connectWebSocket(session.myIdentityId, async (event) => {
      if (event.type === "NEW_SENDER_KEY") {
        // Получен новый ключ отправителя — готов для следующих расшифровок
      }

      if (event.type === "NEW_GROUP_MESSAGE" && event.data.groupId === session.groupId) {
        const d = event.data;
        const isMe = d.senderIdentityId === session.myIdentityId;
        const text = await clientCrypto.decryptTextMessage(
          d.encryptedPayload,
          session.groupId,
          d.senderIdentityId
        );

        onNewMessage({
          id: d.id,
          groupId: d.groupId,
          senderIdentityId: d.senderIdentityId,
          text,
          createdAt: d.createdAt,
          isMe,
        });
      }
    });
  },
};