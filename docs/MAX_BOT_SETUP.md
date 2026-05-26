# Регистрация бота в MAX

1. Откройте в MAX чат с **@MasterBot**.
2. Выполните `/create` и следуйте подсказкам:
   - имя бота;
   - username (заканчивается на `_bot`).
3. Получите **Access Token** — это ваш `MAX_BOT_TOKEN`.
4. Включите команды через `/commands` и пропишите:
   ```
   start - Приветствие и подсказки
   search - Мгновенный AI-поиск новостей: /search <запрос>
   subscribe - Подписаться на ежечасный мониторинг: /subscribe <запрос>
   unsubscribe - Отписаться от запроса
   list - Мои подписки
   ```
5. Webhook — см. `docs/DEPLOY.md`.

## Если API MAX отличается

Документация MAX Bot API на момент написания минимальна. Если реальные имена
методов или формат payload отличаются — правьте константы `MAX_API_BASE` и
`METHODS` в `nextjs-bot/src/lib/max.ts`. Все вызовы изолированы там, в
остальном коде используются только функции `sendMessage`, `editMessage`,
`setWebhook`, `answerCallback`.
