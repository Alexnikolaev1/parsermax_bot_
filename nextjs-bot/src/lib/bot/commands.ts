import { hasLlm } from "../config";
import { formatHelp } from "../formatter";
import { sendMessage } from "../telegram";
import { checkRateLimit } from "../rateLimit";
import { saveLastQuery } from "../services/lastQuery";
import { clearPending, getPending, setPending } from "../services/pending";
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
import {
  cancelKeyboard,
  helpKeyboard,
  mainMenuKeyboard,
  settingsKeyboard,
  subscriptionsKeyboard,
} from "./menu";

async function ensureRateLimit(ctx: BotContext): Promise<boolean> {
  if (await checkRateLimit(ctx.userId)) return true;
  await sendMessage({
    chatId: ctx.chatId,
    text: "⏳ Слишком много запросов. Подождите минуту.",
    replyMarkup: mainMenuKeyboard(),
  });
  return false;
}

export async function sendHome(ctx: BotContext): Promise<void> {
  await sendMessage({
    chatId: ctx.chatId,
    text:
      "👋 <b>AI News Bot</b>\n\n" +
      "Собираю новости из Telegram-каналов, YouTube, Reddit, Hacker News, RSS и Google News — " +
      "и свожу в AI-дайджест.\n\n" +
      "Выберите действие кнопкой ниже или напишите запрос текстом.",
    replyMarkup: mainMenuKeyboard(),
  });
}

export async function sendSettings(ctx: BotContext, extra?: string): Promise<void> {
  const p = await getUserPrefs(ctx.userId);
  await sendMessage({
    chatId: ctx.chatId,
    text:
      (extra ? `${extra}\n\n` : "") +
      "⚙️ <b>Настройки</b>\n" +
      `• Глубина поиска: <b>${p.hoursBack}</b> ч\n` +
      `• Статистика источников: ${p.showSourceStats ? "вкл" : "выкл"}\n` +
      `• LLM: ${hasLlm() ? "подключён" : "не настроен"}`,
    replyMarkup: settingsKeyboard(p.hoursBack, p.showSourceStats),
  });
}

export async function handleStart(ctx: BotContext): Promise<void> {
  await clearPending(ctx.userId);
  return sendHome(ctx);
}

export async function handleHelp(ctx: BotContext): Promise<void> {
  await sendMessage({
    chatId: ctx.chatId,
    text: formatHelp(),
    replyMarkup: helpKeyboard(),
  });
}

export async function handleSearch(ctx: BotContext, query: string): Promise<void> {
  const q = query.trim();
  if (!q) {
    await setPending(ctx.userId, "search");
    await sendMessage({
      chatId: ctx.chatId,
      text: "🔍 Напишите, что искать — одним сообщением.",
      replyMarkup: cancelKeyboard(),
    });
    return;
  }

  await clearPending(ctx.userId);
  if (!(await ensureRateLimit(ctx))) return;

  await saveLastQuery(ctx.userId, q);
  const prefs = await getUserPrefs(ctx.userId);
  const status = await sendMessage({
    chatId: ctx.chatId,
    text: "🔄 Обыскиваю Telegram, YouTube, новости, Reddit и HN…",
    replyMarkup: cancelKeyboard(),
  });

  await runSearchPipeline({
    userId: ctx.userId,
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
    await setPending(ctx.userId, "subscribe");
    await sendMessage({
      chatId: ctx.chatId,
      text: "➕ Напишите тему для подписки.",
      replyMarkup: cancelKeyboard(),
    });
    return;
  }

  await clearPending(ctx.userId);
  const sub: Subscription = {
    userId: ctx.userId,
    chatId: ctx.chatId,
    query: q,
    createdAt: new Date().toISOString(),
  };
  await addSubscription(sub);
  await saveLastQuery(ctx.userId, q);
  await sendMessage({
    chatId: ctx.chatId,
    text: `✅ Подписка: <b>${esc(q)}</b>\nБуду присылать дайджест при новых материалах (раз в час).`,
    replyMarkup: mainMenuKeyboard(),
  });
}

export async function handleUnsubscribe(ctx: BotContext, query: string): Promise<void> {
  const q = query.trim();
  if (!q) {
    await sendMessage({
      chatId: ctx.chatId,
      text: "Использование: /unsubscribe &lt;запрос&gt;",
      replyMarkup: mainMenuKeyboard(),
    });
    return;
  }
  await removeSubscription(ctx.userId, q);
  await sendMessage({
    chatId: ctx.chatId,
    text: `🗑 Подписка удалена: <b>${esc(q)}</b>`,
    replyMarkup: mainMenuKeyboard(),
  });
  return handleList(ctx);
}

export async function handleList(ctx: BotContext): Promise<void> {
  const subs = await listUserSubscriptions(ctx.userId);
  if (!subs.length) {
    await sendMessage({
      chatId: ctx.chatId,
      text: "📋 <b>Подписок пока нет.</b>\n\nНажмите «➕ Новая подписка» или /subscribe &lt;тема&gt;.",
      replyMarkup: subscriptionsKeyboard([]),
    });
    return;
  }

  const list = subs.map((s, i) => `${i + 1}. ${s.query}`).join("\n");
  await sendMessage({
    chatId: ctx.chatId,
    text:
      `📋 <b>Ваши подписки:</b>\n${list}\n\n` +
      "<i>🔍 — поиск · 🗑 — отписаться</i>",
    replyMarkup: subscriptionsKeyboard(subs.map((s) => s.query)),
  });
}

export async function handleSettings(ctx: BotContext, args: string): Promise<void> {
  const parts = args.trim().split(/\s+/);

  if (!parts[0] || parts[0] === "show") {
    return sendSettings(ctx);
  }

  if (parts[0] === "hours" && parts[1]) {
    const h = Number(parts[1]);
    if (!Number.isFinite(h) || h < 1 || h > 48) {
      await sendMessage({ chatId: ctx.chatId, text: "Укажите часы от 1 до 48." });
      return;
    }
    await setUserPrefs(ctx.userId, { hoursBack: h });
    return sendSettings(ctx, `✅ Глубина поиска: <b>${h}</b> ч.`);
  }

  if (parts[0] === "stats") {
    const on = parts[1] !== "off";
    await setUserPrefs(ctx.userId, { showSourceStats: on });
    return sendSettings(ctx, `✅ Статистика: ${on ? "вкл" : "выкл"}.`);
  }

  const p = await getUserPrefs(ctx.userId);
  await sendMessage({
    chatId: ctx.chatId,
    text: "Используйте кнопки ниже или /settings hours 12.",
    replyMarkup: settingsKeyboard(p.hoursBack, p.showSourceStats),
  });
}

export async function handleSources(ctx: BotContext): Promise<void> {
  const lines = NEWS_SOURCES.map((s) => {
    const ok = s.isAvailable();
    return `${s.emoji} ${s.label} — ${ok ? "✅" : "⏸"}`;
  });
  await sendMessage({
    chatId: ctx.chatId,
    text: `📡 <b>Источники (${NEWS_SOURCES.length})</b>\n\n${lines.join("\n")}`,
    replyMarkup: mainMenuKeyboard(),
  });
}

export async function handleUnknown(ctx: BotContext): Promise<void> {
  await sendMessage({
    chatId: ctx.chatId,
    text: "Не понял команду. Выберите в меню или /help.",
    replyMarkup: mainMenuKeyboard(),
  });
}

export async function handlePendingText(ctx: BotContext): Promise<boolean> {
  const pending = await getPending(ctx.userId);
  if (!pending) return false;

  if (pending === "search") {
    await handleSearch(ctx, ctx.text);
    return true;
  }
  if (pending === "subscribe") {
    await handleSubscribe(ctx, ctx.text);
    return true;
  }
  return false;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
