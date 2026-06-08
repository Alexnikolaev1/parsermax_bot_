# Telegram AI News Bot — универсальный монитор новостей

Telegram-бот, который обыскивает интернет по ключевому слову (Google News, RSS 50+ СМИ,
Reddit, Hacker News, публичные Telegram-каналы через Telethon, YouTube) и выдаёт
AI-дайджест: фильтр релевантности, краткий пересказ, категоризация, sentiment,
кластеризация одинаковых сюжетов.

## Архитектура

Два сервиса:

1. **`nextjs-bot/`** — основной бот на Next.js 14 (App Router) для деплоя на
   **Vercel**. Webhook Telegram, поиск, LLM, cron-дайджесты.
2. **`tg-worker/`** — Python (FastAPI + Telethon) для полнотекстового поиска
   по публичным Telegram-каналам через MTProto.

Схема — в [`ARCHITECTURE.md`](./ARCHITECTURE.md).

### Команды бота

| Команда | Описание |
|---------|----------|
| `/search <запрос>` или просто текст | Мгновенный AI-дайджест |
| `/subscribe` / `/unsubscribe` / `/list` | Почасовой мониторинг |
| `/settings hours 12` | Глубина поиска (1–48 ч) |
| `/sources` | Статус подключённых источников |
| `/menu` | Главное меню с кнопками |
| `/help` | Справка |

Под сообщениями — **inline-кнопки**: поиск, подписки, настройки, обновить дайджест, отписаться.

## Быстрый старт

1. **Бот в Telegram.** [@BotFather](https://t.me/BotFather) → `/newbot` → `TELEGRAM_BOT_TOKEN`.
   Подробнее — [`docs/TELEGRAM_BOT_SETUP.md`](./docs/TELEGRAM_BOT_SETUP.md).
2. **Upstash Redis.** Бесплатный Redis на <https://upstash.com>.
3. **LLM-ключ.** `LOVABLE_API_KEY` или `OPENAI_API_KEY`.
4. **Telegram-сессия** для tg-worker — [`docs/TG_SESSION.md`](./docs/TG_SESSION.md).
5. **Деплой** — [`docs/DEPLOY.md`](./docs/DEPLOY.md).

## Стек

| Компонент | Технология |
|---|---|
| Бот | Next.js 14, Telegram Bot API |
| Кеш / подписки | Upstash Redis |
| AI | OpenAI-compatible gateway (Lovable / OpenAI) |
| TG-поиск | Telethon worker (Railway / VPS) |
| Cron | Vercel Cron (digest hourly) |

## Структура `nextjs-bot/src/lib/`

```
bot/          router, commands, callbacks, menu
services/     searchPipeline, subscriptions, userPrefs
sources/      registry + адаптеры (RSS, Reddit, HN, …)
core/         dedupe, query parsing
telegram.ts   единственный клиент Telegram Bot API
```
