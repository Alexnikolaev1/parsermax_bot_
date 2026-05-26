import { getConfig } from "../config";
import type { NewsSource } from "./types";
import { fetchGoogleNews } from "./googleNewsRss";
import { fetchRssFeeds } from "./rssFeeds";
import { fetchReddit } from "./reddit";
import { fetchTelegramWeb } from "./telegramWeb";
import { fetchTelegramViaWorker } from "./telegramWorker";
import { fetchYouTube } from "./youtubeRss";
import { fetchHackerNews } from "./hackerNews";

/** Все подключённые источники новостей. Порядок = приоритет в статистике. */
export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "googlenews",
    kind: "googlenews",
    label: "Google News",
    emoji: "📰",
    timeoutMs: 5000,
    isAvailable: () => true,
    fetch: (q) => fetchGoogleNews(q),
  },
  {
    id: "rss",
    kind: "rss",
    label: "RSS СМИ",
    emoji: "📰",
    timeoutMs: 12000,
    isAvailable: () => true,
    fetch: fetchRssFeeds,
  },
  {
    id: "reddit",
    kind: "reddit",
    label: "Reddit",
    emoji: "👽",
    timeoutMs: 5000,
    isAvailable: () => true,
    fetch: fetchReddit,
  },
  {
    id: "hackernews",
    kind: "hackernews",
    label: "Hacker News",
    emoji: "🟠",
    timeoutMs: 5000,
    isAvailable: () => true,
    fetch: fetchHackerNews,
  },
  {
    id: "telegram_web",
    kind: "telegram_web",
    label: "Telegram (web)",
    emoji: "✈️",
    timeoutMs: 8000,
    isAvailable: () => true,
    fetch: fetchTelegramWeb,
  },
  {
    id: "telegram_worker",
    kind: "telegram",
    label: "Telegram (MTProto)",
    emoji: "✈️",
    timeoutMs: 9000,
    isAvailable: () => {
      const c = getConfig();
      return Boolean(c.TG_WORKER_URL && c.TG_WORKER_TOKEN);
    },
    fetch: fetchTelegramViaWorker,
  },
  {
    id: "youtube",
    kind: "youtube",
    label: "YouTube",
    emoji: "📺",
    timeoutMs: 6000,
    isAvailable: () => true,
    fetch: (q) => fetchYouTube(q),
  },
];

export function listAvailableSources(): NewsSource[] {
  return NEWS_SOURCES.filter((s) => s.isAvailable());
}
