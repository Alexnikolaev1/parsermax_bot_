# Architecture

```mermaid
flowchart TD
    User[👤 Пользователь Telegram]
    TG[💬 Telegram Bot API]
    Webhook[/api/bot/webhook<br/>Vercel/]
    Setup[/api/bot/setup/]
    Instant[/api/search/instant/]
    Digest[/api/cron/digest<br/>hourly/]
    Scrape[/api/cron/scrape<br/>5 min/]

    Engine[searchEngine.ts]
    AI[aiProcessor.ts<br/>Lovable AI Gateway]
    Fmt[formatter.ts HTML]
    Redis[(Upstash Redis<br/>cache, subs, dedup)]

    GN[Google News RSS]
    RSS[50+ RSS СМИ]
    Reddit[Reddit JSON]
    HN[Hacker News Algolia]
    TgWeb[t.me/s/&lt;channel&gt;]
    YT[YouTube via GNews]
    TgWorker[🐍 tg-worker<br/>FastAPI + Telethon<br/>Railway/VPS]

    User -- /search Q --> TG
    TG -- webhook --> Webhook
    Setup -- setWebhook + setMyCommands --> TG
    Webhook --> Engine
    Webhook --> Redis
    Instant --> Engine
    Digest --> Redis
    Digest --> Engine
    Scrape --> Engine

    Engine --> GN
    Engine --> RSS
    Engine --> Reddit
    Engine --> HN
    Engine --> TgWeb
    Engine --> YT
    Engine -- HTTP + Bearer --> TgWorker
    TgWorker -. MTProto .-> Telegram[(Telegram MTProto)]

    Engine --> AI
    AI --> Fmt
    Fmt -- sendMessage --> TG
    TG --> User
```

## Поток `/search`

1. Telegram шлёт Update → `webhook/route.ts` (проверка `X-Telegram-Bot-Api-Secret-Token`).
2. `bot/router.ts` — команды, inline-кнопки или свободный текст.
3. Idempotency + rate limit (Redis).
4. `services/searchPipeline.ts` — статус → `searchEngine` → `aiProcessor` → отправка.
5. `sources/registry.ts` — GN, RSS, Reddit, HN, TG×2, YouTube.
6. Дедуп в `core/dedupe.ts`.
7. HTML-дайджест + inline-кнопки «Обновить / Подписаться».

## Поток ежечасного digest

1. Vercel Cron → `digest/route.ts`.
2. Redis SCAN `sub:*` → список подписок.
3. searchEngine + aiProcessor → только новые материалы.
4. `sendLongMessage` в Telegram chat_id подписчика.

## Настройка бота

`GET /api/bot/setup?url=...` (Bearer `CRON_SECRET`):
- `setWebhook` с `secret_token`
- `setMyCommands` — меню `/` в Telegram
