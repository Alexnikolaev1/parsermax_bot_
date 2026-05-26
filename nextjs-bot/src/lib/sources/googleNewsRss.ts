import Parser from "rss-parser";
import type { RawNews } from "../types";
import { normalizeUrl } from "../utils";

const parser = new Parser({
  timeout: 3000,
  headers: { "User-Agent": "MAXNewsBot/1.0 (+news monitor)" },
});

/**
 * Google News RSS — самый широкий бесплатный агрегатор. Поддерживает
 * операторы поиска и языковые фильтры. when:1h ограничивает свежими.
 */
export async function fetchGoogleNews(query: string): Promise<RawNews[]> {
  const q = encodeURIComponent(`"${query}" when:6h`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=ru&gl=RU&ceid=RU:ru`;
  const feed = await parser.parseURL(url);
  return feed.items.slice(0, 30).map((it): RawNews => ({
    id: normalizeUrl(it.link ?? ""),
    title: stripHtml(it.title ?? ""),
    snippet: stripHtml(it.contentSnippet ?? it.content ?? ""),
    url: it.link ?? "",
    source: it.creator ?? feed.title ?? "Google News",
    kind: "googlenews",
    publishedAt: toIso(it.isoDate ?? it.pubDate),
  }));
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toIso(d?: string): string {
  if (!d) return new Date().toISOString();
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

