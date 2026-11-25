import { jsonResponse } from "./response.ts";
import { authenticateRequest } from "./auth.middleware.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types.ts";
import type { DeviceService } from "../domain/messaging/device.service.ts";
import type { ChatService } from "../domain/messaging/chat.service.ts";
import { wsHub } from "../domain/messaging/ws.ts";
import type { UUID } from "../types/primitives.ts";

export interface AppServices {
  authClient: SupabaseClient<Database>;
  deviceService: DeviceService;
  chatService: ChatService;
}

export async function handleApiRequest(
  req: Request,
  services: AppServices,
): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // 1. WebSocket Upgrade Endpoint: /api/chat/ws?identityId=<UUID>
  if (path === "/api/chat/ws") {
    if (req.headers.get("upgrade") !== "websocket") {
      return new Response("Expected WebSocket Upgrade", { status: 426 });
    }
    const identityId = url.searchParams.get("identityId") as UUID;
    if (!identityId) {
      return new Response("Missing identityId", { status: 400 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    wsHub.register(identityId, socket);
    return response;
  }

  // 2. Авторизация по Bearer-токену для всех REST-роутов
  const auth = await authenticateRequest(req, services.authClient);
  if (!auth) {
    return jsonResponse({ error: "UNAUTHORIZED" }, 401);
  }

  try {
    // POST /api/devices/register
    if (method === "POST" && path === "/api/devices/register") {
      const body = await req.json();
      const res = await services.deviceService.registerDevice({
        ...body,
        userId: auth.userId,
      });
      return jsonResponse(res);
    }

    // POST /api/chat/groups (Открыть/создать защищенный диалог)
    if (method === "POST" && path === "/api/chat/groups") {
      const body = await req.json();
      const res = await services.chatService.getOrCreateDirectChat(
        auth.userId,
        body.callerIdentityId,
        body.targetUserId,
      );
      return jsonResponse(res);
    }

    // POST /api/chat/groups/:id/sender-keys
    const senderKeysMatch = path.match(/^\/api\/chat\/groups\/([^/]+)\/sender-keys$/);
    if (senderKeysMatch) {
      const groupId = senderKeysMatch[1] as UUID;
      if (method === "POST") {
        const body = await req.json();
        await services.chatService.distributeSenderKeys({
          groupId,
          senderIdentityId: body.senderIdentityId,
          keys: body.keys,
        });
        return jsonResponse({ success: true });
      }

      if (method === "GET") {
        const receiverIdentityId = url.searchParams.get("identityId") as UUID;
        const keys = await services.chatService.getIncomingSenderKeys(groupId, receiverIdentityId);
        return jsonResponse(keys);
      }
    }

    // POST /api/chat/groups/:id/messages
    const messagesMatch = path.match(/^\/api\/chat\/groups\/([^/]+)\/messages$/);
    if (messagesMatch) {
      const groupId = messagesMatch[1] as UUID;

      if (method === "POST") {
        const body = await req.json();
        const msg = await services.chatService.postMessage({
          groupId,
          clientMessageId: body.clientMessageId,
          senderIdentityId: body.senderIdentityId,
          sequenceIteration: body.sequenceIteration,
          encryptedPayloadHex: body.encryptedPayloadHex,
        });
        return jsonResponse(msg);
      }

      if (method === "GET") {
        const limit = Number(url.searchParams.get("limit") ?? "50");
        const cursor = url.searchParams.get("cursor") ?? undefined;
        const history = await services.chatService.getMessages(groupId, limit, cursor);
        return jsonResponse(history);
      }
    }

    return jsonResponse({ error: "NOT_FOUND" }, 404);
  } catch (err: any) {
    console.error(`[API Error] ${method} ${path}:`, err);
    return jsonResponse({ error: err.message || "INTERNAL_ERROR" }, 400);
  }
}