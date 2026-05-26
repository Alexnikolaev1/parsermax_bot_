# Architecture

```mermaid
flowchart TD
    User[👤 Пользователь MAX]
    MAX[💬 MAX Messenger]
    Webhook[/api/bot/webhook<br/>Vercel/]
    Instant[/api/search/instant/]
    Digest[/api/cron/digest<br/>hourly/]
    Scrape[/api/cron/scrape<br/>5 min/]

    Engine[searchEngine.ts]
    AI[aiProcessor.ts<br/>Lovable AI Gateway]
    Fmt[formatter.ts]
    Redis[(Upstash Redis<br/>cache, subs, dedup)]

    GN[Google News RSS]
    RSS[50+ RSS СМИ]
    Reddit[Reddit JSON]
    HN[Hacker News Algolia]
    TgWeb[t.me/s/&lt;channel&gt;]
    YT[YouTube via GNews]
    TgWorker[🐍 tg-worker<br/>FastAPI + Telethon<br/>Railway/VPS]

    User -- /search Q --> MAX
    MAX -- webhook --> Webhook
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
    Fmt -- sendMessage --> MAX
    MAX --> User
```

## Поток `/search`

1. MAX шлёт webhook → `webhook/route.ts` (тонкий слой).
2. `bot/router.ts` маршрутизирует команды или свободный текст как поиск.
3. Idempotency + rate limit (настраивается через env).
4. `services/searchPipeline.ts` — статус → `searchEngine` → `aiProcessor` → отправка.
5. `sources/registry.ts` — плагинные источники (GN, RSS, Reddit, HN, TG×2, YouTube).
6. Дедуп в `core/dedupe.ts`: URL → SHA заголовка → Левенштейн ≥ 0.85.
7. LLM tool-calling → `formatter` (+ статистика источников, split длинных сообщений).

## Поток ежечасного digest

1. Vercel Cron триггерит `digest/route.ts` (Bearer от Vercel).
2. Redis SCAN `sub:*` → список (userId, query).
3. Для каждой подписки: searchEngine + aiProcessor.
4. Дедуп через `seen:<userId>:<urlHash>` (TTL 24 ч).
5. Если новых нет — пропускаем (или раз в сутки шлём «ничего не найдено»).
