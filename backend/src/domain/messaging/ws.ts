import type { UUID } from "../../types/primitives.ts";

export type WebSocketMessageEvent =
  | {
    type: "NEW_GROUP_MESSAGE";
    data: {
      id: UUID;
      groupId: UUID;
      clientMessageId: UUID;
      senderIdentityId: UUID;
      sequenceIteration: number;
      encryptedPayload: string;
      createdAt: string;
    };
  }
  | {
    type: "NEW_SENDER_KEY";
    data: {
      id: UUID;
      groupId: UUID;
      senderIdentityId: UUID;
      receiverIdentityId: UUID;
      generation: number;
      messageType: number;
      encryptedSenderKey: string;
      createdAt: string;
    };
  };

/**
 * In-Memory менеджер активных WebSocket-подключений.
 * Индексирует сокеты по identityId конкретных устройств.
 */
export class ChatWebSocketHub {
  private connections = new Map<UUID, Set<WebSocket>>();

  register(identityId: UUID, socket: WebSocket): void {
    let set = this.connections.get(identityId);
    if (!set) {
      set = new Set();
      this.connections.set(identityId, set);
    }
    set.add(socket);

    socket.addEventListener("close", () => {
      this.unregister(identityId, socket);
    });

    socket.addEventListener("error", () => {
      this.unregister(identityId, socket);
    });
  }

  unregister(identityId: UUID, socket: WebSocket): void {
    const set = this.connections.get(identityId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) {
      this.connections.delete(identityId);
    }
  }

  /**
   * Отправка события списку целевых крипто-устройств.
   */
  broadcast(targetIdentityIds: UUID[], payload: WebSocketMessageEvent): void {
    const raw = JSON.stringify(payload);
    for (const identityId of targetIdentityIds) {
      const set = this.connections.get(identityId);
      if (!set) continue;
      for (const socket of set) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(raw);
        }
      }
    }
  }
}

export const wsHub = new ChatWebSocketHub();