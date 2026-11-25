import { createClient } from "@supabase/supabase-js";
import { adminDb } from "./db/client.ts";
import { RelationsService } from "./domain/triplet/service.ts";
import { PurgeQueueWorker } from "./domain/triplet/purge.worker.ts";
import { DeviceService } from "./domain/messaging/device.service.ts";
import { ChatService } from "./domain/messaging/chat.service.ts";
import { handleApiRequest } from "./api/router.ts";
import { corsHeaders } from "./api/response.ts";

const port = Number(Deno.env.get("PORT") ?? 8080);

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const authClient = createClient(supabaseUrl, supabaseAnonKey);

// 1. In-Memory Triplet Graph
const relationsService = new RelationsService(adminDb);
console.log("Загрузка графа связей в оперативную память...");
await relationsService.init();
console.log("Граф связей успешно проиндексирован.");

// 2. Очередь удаления сущностей
const purgeWorker = new PurgeQueueWorker(adminDb, relationsService);
purgeWorker.start();
console.log("Воркер очередей удаления активен.");

// 3. Доменные сервисы сообщений и криптографии
const deviceService = new DeviceService(adminDb);
const chatService = new ChatService(adminDb, relationsService);

// 4. Запуск Deno HTTP/WS сервера
Deno.serve({ port }, (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "content-type": "application/json" },
    });
  }

  return handleApiRequest(req, {
    authClient,
    deviceService,
    chatService,
  });
});

console.log(`Deno Untrusted Relay запущен на порту :${port}`);