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

В Vercel Project → Settings → Environment Variables:

| Переменная | Значение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | от @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | случайные 32+ символа |
| `LOVABLE_API_KEY` | (или OPENAI_API_KEY) |
| `LLM_BASE_URL` | `https://ai.gateway.lovable.dev/v1` |
| `LLM_MODEL` | `google/gemini-3-flash-preview` |
| `UPSTASH_REDIS_REST_URL` | из Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | из Upstash |
| `TG_WORKER_URL` | публичный URL воркера |
| `TG_WORKER_TOKEN` | = WORKER_TOKEN воркера |
| `CRON_SECRET` | случайные 32+ символа |

После сохранения — Redeploy.

## 3. Регистрация webhook в Telegram

```bash
curl "https://<your-app>.vercel.app/api/bot/setup?url=https://<your-app>.vercel.app/api/bot/webhook" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Ответ: `{"ok":true,"webhookUrl":"...","commands":8,"info":{...}}`.

Telegram будет слать обновления с заголовком
`X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>`.

Подробнее — [`TELEGRAM_BOT_SETUP.md`](./TELEGRAM_BOT_SETUP.md).

## 4. Smoke test

1. `curl https://<your-app>.vercel.app/api/cron/health` → `redis`, `llm`, `tgWorker`.
2. `curl -H "Authorization: Bearer <CRON_SECRET>" "https://<your-app>.vercel.app/api/search/instant?q=Путин&hours=6"` → JSON с `digest`.
3. В Telegram напишите боту `/start`, затем «нейросети» или `/search Путин`.
