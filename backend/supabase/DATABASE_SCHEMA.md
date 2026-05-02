# Архитектура Базы Данных (Supabase PostgreSQL)

## 📌 Общая информация
- База данных используется для пошаговой многопользовательской карточной игры (Pasur).
- Игра работает через Supabase Realtime (подписки на изменения в таблицах `rooms` и `users`).
- Все сложные вычисления и изменения состояния происходят на Edge Functions (Deno). Клиент (фронтенд) **не имеет прямого доступа к записи** в таблицы `rooms` и `users` (используется Service Role Key на сервере).
- Для защиты секретной информации (настоящие ID игроков, колода карт) используется отдельная таблица `room_secrets`.

---

## 🗄️ Таблица `users`
Хранит публичные профили пользователей, их баланс и настройки.

| Колонка | Тип данных | Описание |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Уникальный идентификатор (ссылается на `auth.users(id)` с `ON DELETE CASCADE`). |
| `display_name` | `text` | Отображаемое имя пользователя. |
| `balance` | `numeric` | Игровая валюта (дефолт: `0`). |
| `active_rooms` | `uuid[]` | Массив ID комнат, в которых юзер сейчас играет (дефолт: `'{ }'`). |
| `is_deleted` | `boolean` | Флаг мягкого удаления/бана (дефолт: `false`). |
| `settings` | `jsonb` | Настройки профиля: `{ isIncognito: boolean, avatarEmoji: string, gender: string, blockedUids: string[] }`. |

---

## 🗄️ Таблица `rooms`
Хранит публичную информацию о лобби и текущее состояние игры. **Доступна для чтения всем клиентам**.

| Колонка | Тип данных | Описание |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Уникальный ID комнаты. |
| `status` | `text` | Состояние комнаты (`waiting`, `ready_check`, `playing`, `finished`, `paused`, `ready_check_resume`, `pause_requested`). |
| `max_players` | `integer` | Максимальное количество игроков (дефолт: `2`). |
| `bet_amount` | `numeric` | Ставка в монетах (списывается при входе, зачисляется победителю с учетом комиссии). |
| `rule_set` | `text` | Правила игры (`local` или `classic`). |
| `is_private` | `boolean` | Если `true` — не отображается в лобби, вход по коду (дефолт: `false`). |
| `join_code` | `text` | 6-значный код для входа в приватную комнату. |
| `is_strict` | `boolean` | Флаг строгого режима (дефолт: `true`). |
| `is_sudden_death` | `boolean` | Режим досрочной победы до 11 очков в `local` правилах (дефолт: `false`). |
| `turn_duration` | `bigint` | Длительность хода в мс (дефолт: `60000`). |
| `turn_deadline` | `bigint` | Timestamp (ms) окончания текущего хода или паузы. |
| `ready_deadline` | `bigint` | Timestamp (ms) окончания готовности в лобби. |
| `version` | `integer` | Версия стейта для оптимистичных блокировок (дефолт: `1`). |
| `players` | `jsonb` | Массив публичных данных игроков: `[{ id: string, name: string, isReady: boolean }]`. |
| `pause_proposals` | `text[]` | Массив публичных ID игроков, запросивших паузу (дефолт: `'{ }'`). |
| `admin_message` | `text` | Сообщения от сервера (формат `TARGET|Message|Timestamp`). |
| `created_at` | `bigint` | Время создания комнаты. |
| `game_state` | `jsonb` | Сериализованный класс `PasurGame` (см. структуру ниже). |

---

## 🗄️ Таблица `room_secrets`
Скрытая таблица. **Доступна только для Edge Functions**. Содержит конфиденциальные данные, которые нельзя отправлять клиентам.

| Колонка | Тип данных | Описание |
| :--- | :--- | :--- |
| `room_id` | `uuid` (PK, FK) | Ссылка на `rooms(id)` с правилом `ON DELETE CASCADE`. |
| `real_uids` | `jsonb` | Маппинг публичных масок на реальные UUID из `auth`: `{ "anon_123": "uuid-...", "uuid-...": "uuid-..." }`. |
| `deck` | `jsonb` | Оставшаяся колода нерозданных карт. В публичном `game_state` передается только `deckCount`. |

---

## 🎲 Структура `game_state` (jsonb в таблице rooms)
Соответствует классу `PasurGame`.

{
  "ruleSet": "local",
  "isStrict": true,
  "isSuddenDeath": false,
  "deckCount": 32, // Заменяет массив deck для безопасности
  "table": [ { "id": "card_id", "suit": "♠", "rank": "K", "value": 0 } ],
  "players": [
    {
      "id": "anon_123", // Публичный ID или маска
      "teamId": 0,
      "hand": [ ... ], // Текущие карты в руке
      "captured": [ ... ], // Забранные карты
      "surs": 0
    }
  ],
  "currentTurnIndex": 0,
  "matchScores": { "0": 0, "1": 0 },
  "isRoundOver": false,
  "isMatchOver": false,
  "matchWinnerTeamId": null,
  "roundNumber": 1,
  "dealerReservedJacks": [],
  "lastAction": {
    "playerId": "anon_123",
    "playedCard": { ... },
    "capturedCards": [ ... ],
    "timestamp": 1714650000000
  }
}

## ⚙️ Ключевые механизмы и логика
1. **Инкогнито:** Если у пользователя включен режим инкогнито и стол публичный, в `rooms.players` записывается маска вида `anon_...`. Реальный `uuid` хранится в `room_secrets.real_uids`.
2. **Безопасность колоды:** Массив `deck` вырезается из класса `PasurGame` перед сохранением в базу и помещается в `room_secrets.deck`. В `rooms.game_state` остается только длина колоды (`deckCount`).
3. **Cron-очистка:** Раз в период вызывается `runGlobalCleanup`, который проверяет `turn_deadline` и `ready_deadline` в таблице `rooms`. Если время вышло, вызывается `resolveTable` с киком/поражением неактивного игрока.
4. **Каскадное удаление:** При удалении комнаты `delete().eq("id", roomId)` из таблицы `rooms`, PostgreSQL автоматически удаляет связанные секреты из `room_secrets` благодаря `ON DELETE CASCADE`.
5. **Транзакции и баланс:** Изменение баланса игроков (`increment_balance`) и обновление активных комнат (`add_active_room`, `remove_active_room`) выполняются строго через RPC-функции на стороне БД для предотвращения состояний гонки (Race Conditions).