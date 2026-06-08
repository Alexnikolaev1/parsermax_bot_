import type { RawNews } from "../types";
import { fetchWithTimeout, matchesQuery, normalizeUrl } from "../utils";

interface HnHit {
  objectID: string;
  title?: string;
  url?: string;
  story_text?: string;
  author?: string;
  created_at?: string;
  points?: number;
}

/**
 * Hacker News через публичный Algolia API — без ключа, быстрый JSON.
 */
export async function fetchHackerNews(query: string, hoursBack = 6): Promise<RawNews[]> {
  const cutoff = Date.now() - hoursBack * 3600 * 1000;
  const url =
    "https://hn.algolia.com/api/v1/search?" +
    new URLSearchParams({
      query,
      tags: "story",
      numericFilters: `created_at_i>${Math.floor(cutoff / 1000)}`,
      hitsPerPage: "25",
    });

  const res = await fetchWithTimeout(url, {
    headers: { "User-Agent": "TelegramNewsBot/1.0" },
    timeoutMs: 4000,
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { hits?: HnHit[] };
  return (json.hits ?? [])
    .filter((h) => h.title && matchesQuery(`${h.title} ${h.story_text ?? ""}`, query))
    .map(
      (h): RawNews => ({
        id: normalizeUrl(h.url || `https://news.ycombinator.com/item?id=${h.objectID}`),
        title: h.title!.trim(),
        snippet: (h.story_text ?? "").slice(0, 300),
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: `HN · ${h.author ?? "?"}`,
        kind: "hackernews",
        publishedAt: h.created_at ? new Date(h.created_at).toISOString() : new Date().toISOString(),
      })
    );
}
