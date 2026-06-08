# Регистрация бота в Telegram

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram.
2. Отправьте `/newbot`, задайте имя и username (должен заканчиваться на `bot`).
3. Скопируйте **токен** → `TELEGRAM_BOT_TOKEN`.
4. (Опционально) `/setdescription` — описание для профиля бота.
5. (Опционально) `/setuserpic` — аватар.

Меню команд (`/start`, `/search`, …) бот регистрирует автоматически
через `setMyCommands` при вызове [`/api/bot/setup`](../docs/DEPLOY.md).

## Переменные окружения

| Переменная | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен от BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Случайная строка 32+ символа |

## Webhook

### Способ A — скрипт (рекомендуется)

Создайте `nextjs-bot/.env.local` с `TELEGRAM_BOT_TOKEN` и `TELEGRAM_WEBHOOK_SECRET`
(те же значения, что в Vercel).

```bash
cd nextjs-bot
npm run setup:webhook -- --url https://<ваш-публичный-домен>/api/bot/webhook
```

Скрипт вызывает Telegram API напрямую — деплой для *регистрации* webhook не нужен,
но по этому URL бот должен быть доступен из интернета.

### Способ B — через API после деплоя

```bash
curl "https://<your-app>.vercel.app/api/bot/setup?url=https://<your-app>.vercel.app/api/bot/webhook" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### Важно для Vercel

Отключите **Deployment Protection** для Production (Settings → Deployment Protection),
иначе Telegram не сможет слать обновления на webhook (получите «Authentication Required»).

Проверка вручную:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Локальная разработка

Для локального теста используйте [ngrok](https://ngrok.com/) или `cloudflared tunnel`
и передайте публичный URL в `/api/bot/setup?url=...`.

Polling в этом проекте не используется — только webhook (serverless).
