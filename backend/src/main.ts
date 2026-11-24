import { adminDb } from "./db/client.ts";
import { RelationsService } from "./domain/triplet/service.ts";
import { PurgeQueueWorker } from "./domain/triplet/purge.worker.ts";

const port = Number(Deno.env.get("PORT") ?? 8080);

// 1. Инициализация доменного сервиса связей (RAM кэш)
const relationsService = new RelationsService(adminDb);
console.log("Загрузка графа связей в оперативную память...");
await relationsService.init();
console.log("Граф связей успешно проиндексирован.");

// 2. Запуск фонового воркера обработки задач на удаление
const purgeWorker = new PurgeQueueWorker(adminDb, relationsService);
purgeWorker.start();
console.log("Воркер очередей удаления запущен и слушает события.");

// 3. Старт HTTP-сервера
Deno.serve({ port }, (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  if (url.pathname === "/health") {
    return new Response(
      JSON.stringify({ status: "ok" }, null, 2),
      {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }

  return new Response("Not Found", { status: 404 });
});