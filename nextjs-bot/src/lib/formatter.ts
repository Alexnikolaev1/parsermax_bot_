import type { AIDigest, RawNews, SourceKind } from "./types";
import type { SearchResult } from "./searchEngine";
import { NEWS_SOURCES } from "./sources/registry";

const KIND_EMOJI: Record<SourceKind, string> = {
  googlenews: "📰",
  rss: "📰",
  reddit: "👽",
  hackernews: "🟠",
  telegram: "✈️",
  telegram_web: "✈️",
  youtube: "📺",
};

const CATEGORY_EMOJI: Record<string, string> = {
  политика: "🏛️",
  экономика: "💰",
  технологии: "💻",
  спорт: "🏆",
  происшествия: "🚨",
  наука: "🔬",
  общество: "👥",
  культура: "🎭",
  новости: "📰",
};

const SENTIMENT_EMOJI = { positive: "🟢", neutral: "⚪", negative: "🔴" } as const;

/** Рендер дайджеста (HTML для Telegram). */
export function formatDigest(query: string, items: RawNews[], digest: AIDigest): string {
  if (digest.clusters.length === 0) {
    return (
      `🔍 <b>${esc(query)}</b>\n\n` +
      "За выбранный период ничего значимого не найдено. Попробуйте другую формулировку или /settings hours 12."
    );
  }
  const lines: string[] = [];
  lines.push(`🔍 <b>Дайджест:</b> <i>${esc(query)}</i>`);
  lines.push(
    `Сюжетов: <b>${digest.clusters.length}</b>` +
      (digest.filtered ? ` · отфильтровано AI: ${digest.filtered}` : "")
  );
  lines.push("");

  digest.clusters.forEach((c, idx) => {
    const cat = CATEGORY_EMOJI[c.category.toLowerCase()] ?? "📰";
    const sent = SENTIMENT_EMOJI[c.sentiment] ?? "⚪";
    lines.push(`${idx + 1}. ${cat} ${sent} <b>${esc(c.summary)}</b>`);
    for (const i of c.itemIndices.slice(0, 3)) {
      const it = items[i];
      if (!it) continue;
      const emo = KIND_EMOJI[it.kind] ?? "🔗";
      const time = formatTime(it.publishedAt);
      const href = escAttr(it.url);
      lines.push(`   ${emo} <a href="${href}">${esc(it.source)}</a> · ${time}`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

export function formatSourceStats(search: SearchResult): string {
  const parts = NEWS_SOURCES.filter((s) => s.isAvailable()).map((s) => {
    const n = search.perSource[s.id] ?? 0;
    return `${s.emoji} ${s.label}: ${n}`;
  });
  const skipped =
    search.skippedSources.length > 0
      ? `\n<i>Отключено: ${esc(search.skippedSources.join(", "))}</i>`
      : "";
  return (
    `📊 <b>Источники</b> (${(search.elapsedMs / 1000).toFixed(1)} с)\n` +
    parts.join(" · ") +
    skipped
  );
}

export function formatSearchFallback(
  query: string,
  search: SearchResult,
  errorMessage: string
): string {
  const preview = search.items
    .slice(0, 8)
    .map((it, i) => {
      const href = escAttr(it.url);
      return `${i + 1}. ${esc(it.title)} — <a href="${href}">${esc(it.source)}</a>`;
    })
    .join("\n");
  return (
    `🔍 <b>${esc(query)}</b>\n\n` +
    `⚠️ AI временно недоступен: ${esc(errorMessage)}\n\n` +
    `Собрано сырых материалов: <b>${search.items.length}</b>\n\n` +
    (preview || "<i>Пусто</i>") +
    `\n\n` +
    formatSourceStats(search)
  );
}

export function formatHelp(): string {
  return (
    "📖 <b>Справка AI News Bot</b>\n\n" +
    "Управление — кнопками под сообщениями или командами:\n\n" +
    "• <b>Поиск</b> — напишите тему или /search &lt;запрос&gt;\n" +
    "• <b>Подписки</b> — почасовой мониторинг (/subscribe, /list)\n" +
    "• <b>Настройки</b> — глубина 6/12/24 ч, статистика источников\n" +
    "• /menu — главное меню\n" +
    "• /unsubscribe &lt;тема&gt; — отписаться (или кнопка 🗑 в списке)"
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}
