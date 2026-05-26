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

/** Рендер итогового дайджеста для отправки в MAX. */
export function formatDigest(query: string, items: RawNews[], digest: AIDigest): string {
  if (digest.clusters.length === 0) {
    return (
      `🔍 *${escapeMd(query)}*\n\n` +
      "За выбранный период ничего значимого не найдено. Попробуйте другую формулировку или /settings hours 12."
    );
  }
  const lines: string[] = [];
  lines.push(`🔍 *Дайджест:* _${escapeMd(query)}_`);
  lines.push(
    `Сюжетов: *${digest.clusters.length}*` +
      (digest.filtered ? ` · отфильтровано AI: ${digest.filtered}` : "")
  );
  lines.push("");

  digest.clusters.forEach((c, idx) => {
    const cat = CATEGORY_EMOJI[c.category.toLowerCase()] ?? "📰";
    const sent = SENTIMENT_EMOJI[c.sentiment] ?? "⚪";
    lines.push(`${idx + 1}. ${cat} ${sent} *${escapeMd(c.summary)}*`);
    for (const i of c.itemIndices.slice(0, 3)) {
      const it = items[i];
      if (!it) continue;
      const emo = KIND_EMOJI[it.kind] ?? "🔗";
      const time = formatTime(it.publishedAt);
      lines.push(`   ${emo} [${escapeMd(it.source)}](${it.url}) · ${time}`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

/** Статистика по источникам после дайджеста. */
export function formatSourceStats(search: SearchResult): string {
  const parts = NEWS_SOURCES.filter((s) => s.isAvailable()).map((s) => {
    const n = search.perSource[s.id] ?? 0;
    return `${s.emoji} ${s.label}: ${n}`;
  });
  const skipped =
    search.skippedSources.length > 0
      ? `\n_Отключено: ${search.skippedSources.join(", ")}_`
      : "";
  return (
    `📊 *Источники* (${(search.elapsedMs / 1000).toFixed(1)} с)\n` +
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
    .map((it, i) => `${i + 1}. ${escapeMd(it.title)} — [${escapeMd(it.source)}](${it.url})`)
    .join("\n");
  return (
    `🔍 *${escapeMd(query)}*\n\n` +
    `⚠️ AI временно недоступен: ${escapeMd(errorMessage)}\n\n` +
    `Собрано сырых материалов: *${search.items.length}*\n\n` +
    (preview || "_Пусто_") +
    `\n\n` +
    formatSourceStats(search)
  );
}

export function formatHelp(): string {
  return (
    "📖 *Справка AI News Bot*\n\n" +
    "Управление — кнопками под сообщениями или командами:\n\n" +
    "• *Поиск* — напишите тему или `/search <запрос>`\n" +
    "• *Подписки* — почасовой мониторинг (`/subscribe`, `/list`)\n" +
    "• *Настройки* — глубина 6/12/24 ч, статистика источников\n" +
    "• `/menu` — главное меню\n" +
    "• `/unsubscribe <тема>` — отписаться"
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

function escapeMd(s: string): string {
  return s.replace(/([_*`\[\]])/g, "\\$1");
}
