# Telegram Session (Telethon)

Чтобы tg-worker мог искать по публичным каналам, нужна **строковая сессия**
Telegram-аккаунта (бот-аккаунт Telegram не подходит — у бота нет доступа к
полнотекстовому поиску по чужим каналам, нужен пользовательский MTProto).

## Шаги

1. **Получить API_ID и API_HASH.**
   - Зайдите на <https://my.telegram.org> с тем же аккаунтом, который
     планируете использовать.
   - "API development tools" → "Create application".
   - Запишите `api_id` и `api_hash`.

2. **Создать строковую сессию.**
   ```bash
   cd tg-worker
   python -m venv .venv && source .venv/bin/activate
   pip install telethon
   python scripts/get_session.py
   ```
   Введите по очереди:
   - `TG_API_ID`
   - `TG_API_HASH`
   - номер телефона в формате `+7999...`
   - код из Telegram
   - 2FA-пароль (если есть)

   На выходе — длинная строка. Это `TG_SESSION_STRING`.

3. **Сохранить как секрет** в Railway / Vercel / VPS — НИКОМУ не показывайте,
   эта сессия даёт полный доступ к аккаунту.

## Важно

- Используйте **отдельный** Telegram-аккаунт для бота, не основной.
- Не превышайте 10 запросов/секунду к Telegram — иначе бан.
- Сессия не истекает, но при подозрении на компрометацию её можно
  отозвать в Telegram → Настройки → Устройства.
