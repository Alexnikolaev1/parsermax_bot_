# Деплой

## 1. Деплой tg-worker

### Railway
```bash
cd tg-worker
railway login
railway init
railway up
```
В Railway → Variables пропишите всё из `.env.example` (TG_API_ID, TG_API_HASH,
TG_SESSION_STRING, WORKER_TOKEN). После деплоя возьмите публичный URL.

### Любой VPS (Docker)
```bash
docker build -t tg-worker .
docker run -d --restart=always -p 8080:8080 \
  -e TG_API_ID=... -e TG_API_HASH=... \
  -e TG_SESSION_STRING=... -e WORKER_TOKEN=... \
  --name tg-worker tg-worker
```
Прокиньте через nginx + Let's Encrypt на HTTPS.

Проверьте: `curl https://<host>/health` → `{"ok": true, "logged_in": true}`.

## 2. Деплой nextjs-bot на Vercel

```bash
cd nextjs-bot
vercel
vercel --prod
```

В Vercel Project → Settings → Environment Variables пропишите всё из
`.env.example`:

| Переменная | Значение |
|---|---|
| `MAX_BOT_TOKEN` | от @MasterBot |
| `MAX_WEBHOOK_SECRET` | случайные 32+ символа |
| `LOVABLE_API_KEY` | (или OPENAI_API_KEY) |
| `LLM_BASE_URL` | `https://ai.gateway.lovable.dev/v1` |
| `LLM_MODEL` | `google/gemini-3-flash-preview` |
| `UPSTASH_REDIS_REST_URL` | из Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | из Upstash |
| `TG_WORKER_URL` | публичный URL воркера |
| `TG_WORKER_TOKEN` | = WORKER_TOKEN воркера |
| `CRON_SECRET` | случайные 32+ символа |

После сохранения — Redeploy.

## 3. Регистрация webhook в MAX

Замените в команде ниже `<bot_token>`, `<your-app>` и `<webhook_secret>`:

```bash
curl -X POST "https://botapi.max.ru/subscriptions?access_token=<bot_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<your-app>.vercel.app/api/bot/webhook",
    "secret": "<webhook_secret>",
    "headers": {"Authorization": "Bearer <webhook_secret>"},
    "update_types": ["message_created", "bot_started", "message_callback"]
  }'
```

Если форма payload в MAX отличается — поправьте `lib/max.ts`.

## 4. Smoke test

1. `curl https://<your-app>.vercel.app/api/cron/health` → все `true`.
2. `curl "https://<your-app>.vercel.app/api/search/instant?q=Путин&hours=6"` →
   JSON с `digest.clusters` и `rendered`.
3. В MAX напишите боту `/start`, затем `/search Путин`.
