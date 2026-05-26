import { splitMessage } from "./utils";

/**
 * Клиент MAX Bot API.
 *
 * Документация MAX (botapi.max.ru) на момент написания минимальна.
 * Если в реальном API имена методов или форма payload отличаются —
 * правьте константы ниже и тела функций. Все вызовы изолированы здесь.
 */

const MAX_API_BASE = "https://botapi.max.ru";

/** Имена методов API. Поправьте, если в MAX отличаются. */
const METHODS = {
  sendMessage: "messages",        // POST /messages?access_token=...
  editMessage: "messages",        // PUT  /messages?access_token=...&message_id=...
  setWebhook: "subscriptions",    // POST /subscriptions?access_token=...
  answerCallback: "answers",      // POST /answers?access_token=...
} as const;

const TOKEN = () => {
  const t = process.env.MAX_BOT_TOKEN;
  if (!t) throw new Error("MAX_BOT_TOKEN is not configured");
  return t;
};

interface SendMessageOpts {
  chatId: string | number;
  text: string;
  /** MAX поддерживает базовый markdown/html — название поля может отличаться. */
  format?: "markdown" | "html";
  replyMarkup?: unknown;
}

async function call(
  method: string,
  init: RequestInit & { searchParams?: Record<string, string> } = {}
): Promise<unknown> {
  const url = new URL(`${MAX_API_BASE}/${method}`);
  url.searchParams.set("access_token", TOKEN());
  if (init.searchParams) {
    for (const [k, v] of Object.entries(init.searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "MAXNewsBot/1.0",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`MAX API ${method} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return data;
}

export async function sendMessage(opts: SendMessageOpts): Promise<{ message_id?: string | number }> {
  const body = {
    chat_id: opts.chatId,
    text: opts.text,
    format: opts.format ?? "markdown",
    ...(opts.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
  };
  const data = (await call(METHODS.sendMessage, {
    method: "POST",
    body: JSON.stringify(body),
  })) as { message_id?: string | number; result?: { message_id?: string | number } };
  return { message_id: data.message_id ?? data.result?.message_id };
}

export async function editMessage(
  messageId: string | number,
  text: string,
  format: "markdown" | "html" = "markdown"
): Promise<void> {
  await call(METHODS.editMessage, {
    method: "PUT",
    searchParams: { message_id: String(messageId) },
    body: JSON.stringify({ text, format }),
  });
}

export async function setWebhook(url: string, secret: string): Promise<unknown> {
  return call(METHODS.setWebhook, {
    method: "POST",
    body: JSON.stringify({
      url,
      // MAX скорее всего поддерживает либо secret_token, либо headers — оставляем оба.
      secret,
      headers: { Authorization: `Bearer ${secret}` },
      update_types: ["message_created", "bot_started", "message_callback"],
    }),
  });
}

export async function answerCallback(callbackId: string, text?: string): Promise<void> {
  await call(METHODS.answerCallback, {
    method: "POST",
    body: JSON.stringify({ callback_id: callbackId, ...(text ? { notification: text } : {}) }),
  });
}

/** Inline-кнопки. Адаптируйте под формат MAX, если он отличается. */
export function inlineKeyboard(rows: Array<Array<{ text: string; payload: string }>>) {
  return {
    type: "inline_keyboard",
    buttons: rows.map((row) =>
      row.map((b) => ({ type: "callback", text: b.text, payload: b.payload }))
    ),
  };
}

/** Отправляет текст частями, если превышает лимит MAX. */
export async function sendLongMessage(opts: {
  chatId: string | number;
  text: string;
  maxChars: number;
  /** Клавиатура только у последней части (после split). */
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
