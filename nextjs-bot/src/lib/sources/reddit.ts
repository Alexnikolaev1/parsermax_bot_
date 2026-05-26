import type { RawNews } from "../types";
import { normalizeUrl } from "../utils";

/**
 * Reddit JSON API — без авторизации работает для публичного поиска.
 * Лимит: разумный rate с UA. Идём по нескольким сабреддитам + общему /search.
 */
const SUBS = ["news", "worldnews", "russia", "europe", "geopolitics", "technology"];

export async function fetchReddit(query: string, hoursBack = 6): Promise<RawNews[]> {
  const cutoff = Date.now() / 1000 - hoursBack * 3600;
  const tasks = SUBS.map(async (sub) => {
    const url =
      `https://www.reddit.com/r/${sub}/search.json?` +
      `q=${encodeURIComponent(query)}&sort=new&restrict_sr=on&t=day&limit=15`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MAXNewsBot/1.0" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [] as RawNews[];
    const json = (await res.json()) as { data?: { children?: Array<{ data: RedditPost }> } };
    const posts = json.data?.children ?? [];
    return posts
      .map((p) => p.data)
      .filter((p) => p.created_utc >= cutoff && !p.over_18)
      .map((p): RawNews => ({
        id: normalizeUrl(p.url),
        title: p.title,
        snippet: (p.selftext ?? "").slice(0, 300),
        url: p.url.startsWith("http") ? p.url : `https://www.reddit.com${p.permalink}`,
        source: `r/${p.subreddit}`,
        kind: "reddit",
        publishedAt: new Date(p.created_utc * 1000).toISOString(),
      }));
  });
  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

interface RedditPost {
  title: string;
  url: string;
  permalink: string;
  selftext?: string;
  subreddit: string;
  created_utc: number;
  over_18: boolean;
}
