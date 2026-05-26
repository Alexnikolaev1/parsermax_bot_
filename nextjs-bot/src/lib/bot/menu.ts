import { inlineKeyboard } from "../max";

/** Короткие payload для inline-кнопок (лимит MAX ~64 байта). */
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

/** Главное меню — показываем после /start и по кнопке «Меню». */
export function mainMenuKeyboard() {
  return inlineKeyboard([
    [
      { text: "🔍 Поиск", payload: CB.SEARCH },
      { text: "📋 Подписки", payload: CB.SUBS },
    ],
    [
      { text: "⚙️ Настройки", payload: CB.SETTINGS },
      { text: "📡 Источники", payload: CB.SOURCES },
    ],
    [{ text: "❓ Помощь", payload: CB.HELP }],
  ]);
}

export function cancelKeyboard() {
  return inlineKeyboard([[{ text: "✖️ Отмена", payload: CB.CANCEL }]]);
}

export function settingsKeyboard(hoursBack: number, statsOn: boolean) {
  const mark = (h: number) => (hoursBack === h ? `· ${h}ч ·` : `${h}ч`);
  return inlineKeyboard([
    [
      { text: mark(6), payload: CB.HOURS(6) },
      { text: mark(12), payload: CB.HOURS(12) },
      { text: mark(24), payload: CB.HOURS(24) },
    ],
    [
      {
        text: statsOn ? "📊 Статистика: вкл" : "📊 Статистика: выкл",
        payload: CB.STATS(!statsOn),
      },
    ],
    [{ text: "🏠 В меню", payload: CB.HOME }],
  ]);
}

/** Кнопки под дайджестом. */
export function digestActionsKeyboard() {
  return inlineKeyboard([
    [
      { text: "🔄 Обновить", payload: CB.REFRESH },
      { text: "➕ Подписаться", payload: CB.SUB_LAST },
    ],
    [{ text: "🏠 Меню", payload: CB.HOME }],
  ]);
}

/** Подписки пользователя — быстрый повторный поиск по теме. */
export function subscriptionsKeyboard(queries: string[]) {
  const rows = queries.slice(0, 5).map((q) => {
    const label = q.length > 28 ? `${q.slice(0, 26)}…` : q;
    return [{ text: `🔍 ${label}`, payload: CB.RUN_QUERY(q) }];
  });
  rows.push([
    { text: "➕ Новая подписка", payload: CB.SUB_ADD },
    { text: "🏠 Меню", payload: CB.HOME },
  ]);
  return inlineKeyboard(rows);
}

export function helpKeyboard() {
  return inlineKeyboard([
    [{ text: "🔍 Начать поиск", payload: CB.SEARCH }],
    [{ text: "🏠 В меню", payload: CB.HOME }],
  ]);
}
