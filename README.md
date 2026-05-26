# MAX News Bot — AI-powered universal news monitor

Бот для российского мессенджера **MAX (МАКС)**, который обыскивает «каждый
уголок интернета» по ключевому слову (Google News, RSS 50+ СМИ, Reddit,
Hacker News, публичные Telegram-каналы через Telethon, YouTube через Google News) и выдаёт
концентрированный AI-дайджест: фильтр релевантности, краткий пересказ,
категоризация, sentiment, кластеризация одинаковых сюжетов.

## Архитектура

Два сервиса:

1. **`nextjs-bot/`** — основной бот на Next.js 14 (App Router) для деплоя на
   **Vercel**. Обрабатывает webhook от MAX, запускает поиск, вызывает LLM,
   рассылает дайджесты по cron.
2. **`tg-worker/`** — отдельный Python-сервис (FastAPI + Telethon) для поиска
   по публичным Telegram-каналам через MTProto. Хостится на Railway / Fly.io
   / любом VPS (на Vercel/Cloudflare Telethon работать не будет — нужен
   long-running процесс).

Полная схема — в [`ARCHITECTURE.md`](./ARCHITECTURE.md).

### Команды бота

| Команда | Описание |
|---------|----------|
| `/search <запрос>` или просто текст | Мгновенный AI-дайджест |
| `/subscribe` / `/unsubscribe` / `/list` | Почасовой мониторинг |
| `/settings hours 12` | Глубина поиска (1–48 ч) |
| `/sources` | Статус подключённых источников |
| `/menu` | Главное меню с кнопками |
| `/help` | Справка |

Под сообщениями — **inline-кнопки**: поиск, подписки, настройки, обновить дайджест.

## Быстрый старт

1. **Регистрация бота в MAX.** Откройте в MAX чат с `@MasterBot`, выполните
   `/create`, получите `MAX_BOT_TOKEN`. Подробнее — [`docs/MAX_BOT_SETUP.md`](./docs/MAX_BOT_SETUP.md).
2. **Upstash Redis.** Создайте бесплатный Redis на <https://upstash.com>,
   возьмите `UPSTASH_REDIS_REST_URL` и `UPSTASH_REDIS_REST_TOKEN`.
3. **LLM-ключ.** Используйте `LOVABLE_API_KEY` (бесплатно через Lovable AI
   Gateway, базовый URL `https://ai.gateway.lovable.dev/v1`) или
   `OPENAI_API_KEY` от OpenAI напрямую — клиент унифицирован.
4. **Telegram-сессия.** Локально:
   ```bash
   cd tg-worker
   python -m venv .venv && source .venv/bin/activate
   pip install -e .
   python scripts/get_session.py
   ```
   Введите номер телефона + код из Telegram → получите `TG_SESSION_STRING`.
   Подробнее — [`docs/TG_SESSION.md`](./docs/TG_SESSION.md).
5. **Деплой воркера на Railway.** `railway init && railway up` (или Docker на
   любом VPS). Запишите публичный URL и любой случайный `WORKER_TOKEN`.
6. **Деплой бота на Vercel.** `cd nextjs-bot && vercel --prod`. В Vercel
   Project Settings → Environment Variables пропишите всё из `.env.example`.
7. **Регистрация webhook в MAX.** См. [`docs/DEPLOY.md`](./docs/DEPLOY.md).
8. **Smoke test.** Напишите боту `/start`, затем `/search Путин`.

## Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие и подсказки |
| `/search <запрос>` | Моментальный поиск + AI-дайджест (≤ 25 с) |
| `/subscribe <запрос>` | Ежечасные авто-дайджесты по запросу |
| `/unsubscribe <запрос>` | Отписаться |
| `/list` | Список ваших подписок |

## Используемые библиотеки и обоснование

### nextjs-bot

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `next` | 14.2.x | App Router, serverless functions с `maxDuration` 60 с (Pro) |
| `@upstash/redis` | ^1.34 | REST-Redis без коннект-пула, идеален для serverless |
| `zod` | ^3.23 | Валидация webhook payload и команд |
| `rss-parser` | ^3.13 | Парсинг RSS/Atom с авто-детектом кодировки |
| `cheerio` | ^1.0 | HTML-парсинг `t.me/s/<channel>` страниц |
| `p-limit` | ^5 | Ограничение параллелизма (10 источников × N запросов) |
| `p-retry` | ^6 | Экспоненциальные ретраи к внешним API |
| `js-levenshtein` | ^1.1 | Нечёткое сравнение заголовков для дедупа |
| `robots-parser` | ^3 | Соблюдение robots.txt при скрапинге |

### tg-worker

| Пакет | Версия | Зачем |
|-------|--------|-------|
| `telethon` | ^1.36 | Полный MTProto-клиент Telegram, метод `search_public_messages` |
| `fastapi` | ^0.115 | Минимальный HTTP-фасад над Telethon |
| `uvicorn[standard]` | ^0.32 | ASGI-сервер для FastAPI |

## Технические оговорки

- **MAX Bot API** — клиент в `lib/max.ts` написан под REST+JSON форму на
  домене `botapi.max.ru`. Если в реальном API отличаются имена методов —
  поправьте константы `MAX_API_BASE` и `METHODS` в файле.
- **Telethon ToS** — воркер ищет только в публичных каналах
  (`search_public_messages`), без сбора персональных данных. Это серая зона:
  использование на свой риск, не превышайте 10 RPS.
- **Vercel Cron на Free** — ограничен 1 cron в день. Для ежечасного digest
  нужен Pro (~$20/мес). В `vercel.json` оставлен `0 * * * *` для digest;
  пятиминутный scrape закомментирован.
- **YouTube без API-ключа** деградирует до Google News с `site:youtube.com`.
  Для полноценного `search.list` добавьте `YOUTUBE_API_KEY` и активируйте
  заготовку `lib/sources/youtubeApi.ts.disabled`.
