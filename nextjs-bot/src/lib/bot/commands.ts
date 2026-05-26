import { hasLlm } from "../config";
import { formatHelp } from "../formatter";
import { sendMessage } from "../max";
import { checkRateLimit } from "../rateLimit";
import { runSearchPipeline } from "../services/searchPipeline";
import {
  addSubscription,
  listUserSubscriptions,
  removeSubscription,
} from "../services/subscriptions";
import { getUserPrefs, setUserPrefs } from "../services/userPrefs";
import { NEWS_SOURCES } from "../sources/registry";
import type { Subscription } from "../types";
import type { BotContext } from "./context";

async function ensureRateLimit(ctx: BotContext): Promise<boolean> {
  if (await checkRateLimit(ctx.userId)) return true;
  await sendMessage({
    chatId: ctx.chatId,
    text: "⏳ Слишком много запросов. Подождите минуту.",
  });
  return false;
}

export async function handleStart(ctx: BotContext): Promise<void> {
  await sendMessage({
    chatId: ctx.chatId,
    text:
      "👋 Привет! Я *AI News Bot* для MAX.\n\n" +
      "Обыскиваю Telegram, YouTube, Reddit, Hacker News, RSS 50+ СМИ и Google News — " +
      "и выдаю AI-дайджест с кластеризацией сюжетов.\n\n" +
      "Напишите запрос текстом или `/search <запрос>`.\n" +
      "Справка: `/help`",
  });
}

export async function handleHelp(_ctx: BotContext): Promise<void> {
  await sendMessage({ chatId: _ctx.chatId, text: formatHelp() });
}

export async function handleSearch(ctx: BotContext, query: string): Promise<void> {
  const q = query.trim();
  if (!q) {
    await sendMessage({ chatId: ctx.chatId, text: "Использование: `/search <запрос>` или просто текст." });
    return;
  }
  if (!(await ensureRateLimit(ctx))) return;

  const prefs = await getUserPrefs(ctx.userId);
  const status = await sendMessage({
    chatId: ctx.chatId,
    text: "🔄 Обыскиваю Telegram, YouTube, новости, Reddit и HN…",
  });

  await runSearchPipeline({
    chatId: ctx.chatId,
    query: q,
    hoursBack: prefs.hoursBack,
    showSourceStats: prefs.showSourceStats,
    statusMessageId: status.message_id,
  });
}

export async function handleSubscribe(ctx: BotContext, query: string): Promise<void> {
  const q = query.trim();
  if (!q) {
    await sendMessage({ chatId: ctx.chatId, text: "Использование: `/subscribe <запрос>`" });
    return;
  }
  const sub: Subscription = {
    userId: ctx.userId,
    chatId: ctx.chatId,
    query: q,
    createdAt: new Date().toISOString(),
  };
  await addSubscription(sub);
  await sendMessage({
    chatId: ctx.chatId,
    text: `✅ Подписка: *${q}*\nДайджест придёт при появлении новых материалов (cron каждый час).`,
  });
}

export async function handleUnsubscribe(ctx: BotContext, query: string): Promise<void> {
  const q = query.trim();
  if (!q) {
    await sendMessage({ chatId: ctx.chatId, text: "Использование: `/unsubscribe <запрос>`" });
    return;
  }
  await removeSubscription(ctx.userId, q);
  await sendMessage({ chatId: ctx.chatId, text: `🗑 Подписка удалена: *${q}*` });
}

export async function handleList(ctx: BotContext): Promise<void> {
  const subs = await listUserSubscriptions(ctx.userId);
  if (!subs.length) {
    await sendMessage({ chatId: ctx.chatId, text: "У вас нет подписок." });
    return;
  }
  const list = subs.map((s, i) => `${i + 1}. ${s.query}`).join("\n");
  await sendMessage({ chatId: ctx.chatId, text: `*Ваши подписки:*\n${list}` });
}

export async function handleSettings(ctx: BotContext, args: string): Promise<void> {
  const parts = args.trim().split(/\s+/);
  if (!parts[0] || parts[0] === "show") {
    const p = await getUserPrefs(ctx.userId);
    await sendMessage({
      chatId: ctx.chatId,
      text:
        `⚙️ *Настройки*\n` +
        `• Глубина поиска: *${p.hoursBack}* ч\n` +
        `• Статистика источников: ${p.showSourceStats ? "да" : "нет"}\n` +
        `• LLM: ${hasLlm() ? "подключён" : "не настроен (сырой fallback)"}\n\n` +
        `Изменить: \`/settings hours 12\``,
    });
    return;
  }

  if (parts[0] === "hours" && parts[1]) {
    const h = Number(parts[1]);
    if (!Number.isFinite(h) || h < 1 || h > 48) {
      await sendMessage({ chatId: ctx.chatId, text: "Укажите часы от 1 до 48." });
      return;
    }
    await setUserPrefs(ctx.userId, { hoursBack: h });
    await sendMessage({ chatId: ctx.chatId, text: `✅ Глубина поиска: *${h}* ч.` });
    return;
  }

  if (parts[0] === "stats") {
    const on = parts[1] !== "off";
    await setUserPrefs(ctx.userId, { showSourceStats: on });
    await sendMessage({
      chatId: ctx.chatId,
      text: `✅ Статистика источников: ${on ? "включена" : "выключена"}.`,
    });
    return;
  }

  await sendMessage({
    chatId: ctx.chatId,
    text: "Неизвестная настройка. Примеры:\n`/settings hours 12`\n`/settings stats off`",
  });
}

export async function handleSources(ctx: BotContext): Promise<void> {
  const lines = NEWS_SOURCES.map((s) => {
    const ok = s.isAvailable();
    return `${s.emoji} ${s.label} — ${ok ? "✅" : "⏸ (нет конфигурации)"}`;
  });
  await sendMessage({
    chatId: ctx.chatId,
    text: `*Источники (${NEWS_SOURCES.length})*\n\n${lines.join("\n")}`,
  });
}

export async function handleUnknown(ctx: BotContext): Promise<void> {
  await sendMessage({
    chatId: ctx.chatId,
    text: "Неизвестная команда. `/help` — список команд.",
  });
}
