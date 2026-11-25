/**
 * Единый HTTP & WebSocket клиент к Deno-серверу (Untrusted Relay).
 */

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

export interface RegisterDeviceResponse {
  deviceId: string;
  identityId: string;
}

export interface DirectChatResponse {
  groupId: string;
  participants: Array<{
    identityId: string;
    userId: string;
    identityKey: string;
  }>;
}

export interface DistributeSenderKeysResponse {
  success: boolean;
}

export interface IncomingSenderKeyResponse {
  id: string;
  group_id: string;
  sender_identity_id: string;
  receiver_identity_id: string;
  message_type: number;
  encrypted_sender_key: string;
  generation: number;
  created_at: string;
}

export interface GroupMessageRowResponse {
  id: string;
  client_message_id: string;
  group_id: string;
  sender_identity_id: string;
  sequence_iteration: number;
  encrypted_payload: string;
  created_at: string;
}

export class ApiClient {
  private token: string | null = null;
  private ws: WebSocket | null = null;

  setAuthToken(token: string | null): void {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed with status ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  // --- Устройства и крипто-профиль ---
  async registerDevice(data: {
    deviceId?: string;
    identityKey: string;
    registrationId: number;
    signedPrekey: string;
    signedPrekeyId: number;
    signedPrekeySignature: string;
  }): Promise<RegisterDeviceResponse> {
    return this.request<RegisterDeviceResponse>("/api/devices/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // --- Чаты и группы ---
  async getOrCreateDirectChat(params: {
    callerIdentityId: string;
    targetUserId: string;
  }): Promise<DirectChatResponse> {
    return this.request<DirectChatResponse>("/api/chat/groups", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async distributeSenderKeys(
    groupId: string,
    senderIdentityId: string,
    keys: Array<{
      receiverIdentityId: string;
      encryptedSenderKeyHex: string;
      generation: number;
      messageType: 2 | 3 | 7;
    }>
  ): Promise<DistributeSenderKeysResponse> {
    return this.request<DistributeSenderKeysResponse>(`/api/chat/groups/${groupId}/sender-keys`, {
      method: "POST",
      body: JSON.stringify({ senderIdentityId, keys }),
    });
  }

  async getIncomingSenderKeys(
    groupId: string,
    identityId: string
  ): Promise<IncomingSenderKeyResponse[]> {
    return this.request<IncomingSenderKeyResponse[]>(
      `/api/chat/groups/${groupId}/sender-keys?identityId=${identityId}`
    );
  }

  // --- Сообщения ---
  async postMessage(
    groupId: string,
    payload: {
      clientMessageId: string;
      senderIdentityId: string;
      sequenceIteration: number;
      encryptedPayloadHex: string;
    }
  ): Promise<GroupMessageRowResponse> {
    return this.request<GroupMessageRowResponse>(`/api/chat/groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getMessages(
    groupId: string,
    limit = 50,
    cursor?: string
  ): Promise<GroupMessageRowResponse[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return this.request<GroupMessageRowResponse[]>(
      `/api/chat/groups/${groupId}/messages?${params.toString()}`
    );
  }

  // --- WebSocket Realtime ---
  connectWebSocket(identityId: string, onEvent: (event: any) => void): () => void {
    const wsUrl = `${API_BASE.replace(/^http/, "ws")}/api/chat/ws?identityId=${identityId}`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.error("[WS Message Error]:", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("[WS Error]:", err);
    };

    return () => {
      ws.close();
      this.ws = null;
    };
  }
}

export const apiClient = new ApiClient();