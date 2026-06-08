import { splitMessage } from "./utils";

/**
 * Клиент Telegram Bot API (https://core.telegram.org/bots/api).
 * Все вызовы к мессенджеру изолированы здесь.
 */

const TOKEN = () => {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return t;
};

const API_BASE = () => `https://api.telegram.org/bot${TOKEN()}`;

interface TgResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
}

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as TgResponse<T>;
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? res.statusText}`);
  }
  return data.result as T;
}

export interface BotCommand {
  command: string;
  description: string;
}

/** Команды в меню «/» у поля ввода Telegram. */
export const BOT_COMMANDS: BotCommand[] = [
  { command: "start", description: "Главное меню" },
  { command: "menu", description: "Открыть меню" },
  { command: "search", description: "AI-поиск по теме" },
  { command: "subscribe", description: "Подписка на мониторинг" },
  { command: "list", description: "Мои подписки" },
  { command: "settings", description: "Настройки поиска" },
  { command: "sources", description: "Статус источников" },
  { command: "help", description: "Справка" },
];

interface SendMessageOpts {
  chatId: string | number;
  text: string;
  parseMode?: "HTML" | "Markdown";
  replyMarkup?: unknown;
  disablePreview?: boolean;
}

interface TgMessage {
  message_id: number;
}

export async function sendMessage(opts: SendMessageOpts): Promise<{ message_id?: number }> {
  const result = await call<TgMessage>("sendMessage", {
    chat_id: opts.chatId,
    text: opts.text,
    parse_mode: opts.parseMode ?? "HTML",
    disable_web_page_preview: opts.disablePreview ?? true,
    ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
  });
  return { message_id: result.message_id };
}

export async function editMessage(
  chatId: string | number,
  messageId: string | number,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<void> {
  await call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  });
}

export async function setWebhook(url: string, secret: string): Promise<unknown> {
  return call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(): Promise<unknown> {
  return call("deleteWebhook", { drop_pending_updates: true });
}

export async function setMyCommands(commands: BotCommand[] = BOT_COMMANDS): Promise<unknown> {
  return call("setMyCommands", { commands });
}

export async function getWebhookInfo(): Promise<unknown> {
  return call("getWebhookInfo", {});
}

export async function answerCallback(callbackQueryId: string, text?: string): Promise<void> {
  await call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text, show_alert: false } : {}),
  });
}

/** Inline-кнопки Telegram (callback_data ≤ 64 байта). */
export function inlineKeyboard(rows: Array<Array<{ text: string; data: string }>>) {
  return {
    inline_keyboard: rows.map((row) =>
      row.map((b) => ({ text: b.text, callback_data: b.data }))
    ),
  };
}

export async function sendLongMessage(opts: {
  chatId: string | number;
  text: string;
  maxChars: number;
  replyMarkup?: unknown;
}): Promise<string[]> {
  const parts = splitMessage(opts.text, opts.maxChars);
  for (let i = 0; i < parts.length; i++) {
    await sendMessage({
      chatId: opts.chatId,
      text: parts[i],
      replyMarkup: i === parts.length - 1 ? opts.replyMarkup : undefined,
    });
  }
  return parts;
}
