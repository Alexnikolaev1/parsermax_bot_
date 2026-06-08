import { inlineKeyboard } from "../telegram";

/** Короткие callback_data для inline-кнопок (лимит Telegram 64 байта). */
export const CB = {
  HOME: "m:home",
  SEARCH: "m:search",
  SUBS: "m:subs",
  SUB_ADD: "m:subadd",
  SETTINGS: "m:set",
  SOURCES: "m:src",
  HELP: "m:help",
  CANCEL: "m:cancel",
  REFRESH: "a:refresh",
  SUB_LAST: "a:sub",
  HOURS: (h: number) => `s:h:${h}`,
  STATS: (on: boolean) => `s:st:${on ? 1 : 0}`,
  RUN_QUERY: (q: string) => `a:q:${encodeQuery(q)}`,
  UNSUB_QUERY: (q: string) => `u:q:${encodeQuery(q)}`,
} as const;

function encodeQuery(q: string): string {
  return Buffer.from(q, "utf8").toString("base64url").slice(0, 48);
}

export function decodeQueryPayload(encoded: string): string | null {
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function mainMenuKeyboard() {
  return inlineKeyboard([
    [
      { text: "🔍 Поиск", data: CB.SEARCH },
      { text: "📋 Подписки", data: CB.SUBS },
    ],
    [
      { text: "⚙️ Настройки", data: CB.SETTINGS },
      { text: "📡 Источники", data: CB.SOURCES },
    ],
    [{ text: "❓ Помощь", data: CB.HELP }],
  ]);
}

export function cancelKeyboard() {
  return inlineKeyboard([[{ text: "✖️ Отмена", data: CB.CANCEL }]]);
}

export function settingsKeyboard(hoursBack: number, statsOn: boolean) {
  const mark = (h: number) => (hoursBack === h ? `· ${h}ч ·` : `${h}ч`);
  return inlineKeyboard([
    [
      { text: mark(6), data: CB.HOURS(6) },
      { text: mark(12), data: CB.HOURS(12) },
      { text: mark(24), data: CB.HOURS(24) },
    ],
    [
      {
        text: statsOn ? "📊 Статистика: вкл" : "📊 Статистика: выкл",
        data: CB.STATS(!statsOn),
      },
    ],
    [{ text: "🏠 В меню", data: CB.HOME }],
  ]);
}

export function digestActionsKeyboard() {
  return inlineKeyboard([
    [
      { text: "🔄 Обновить", data: CB.REFRESH },
      { text: "➕ Подписаться", data: CB.SUB_LAST },
    ],
    [{ text: "🏠 Меню", data: CB.HOME }],
  ]);
}

export function subscriptionsKeyboard(queries: string[]) {
  const rows = queries.slice(0, 5).flatMap((q) => {
    const label = q.length > 22 ? `${q.slice(0, 20)}…` : q;
    return [
      [
        { text: `🔍 ${label}`, data: CB.RUN_QUERY(q) },
        { text: "🗑", data: CB.UNSUB_QUERY(q) },
      ],
    ];
  });
  rows.push([
    { text: "➕ Новая подписка", data: CB.SUB_ADD },
    { text: "🏠 Меню", data: CB.HOME },
  ]);
  return inlineKeyboard(rows);
}

export function helpKeyboard() {
  return inlineKeyboard([
    [{ text: "🔍 Начать поиск", data: CB.SEARCH }],
    [{ text: "🏠 В меню", data: CB.HOME }],
  ]);
}
