import pRetry from "p-retry";
import { hasRedis } from "./config";
import { redis, KEY, TTL } from "./db";
import { dedupeNews } from "./core/dedupe";
import { listAvailableSources, NEWS_SOURCES } from "./sources/registry";
import type { NewsSource } from "./sources/types";
import type { RawNews } from "./types";

export interface SearchResult {
  items: RawNews[];
  perSource: Record<string, number>;
  skippedSources: string[];
  elapsedMs: number;
}

async function withBreaker<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
  if (hasRedis()) {
    const tripped = await redis.get(KEY.breaker(name));
    if (tripped) return null;
  }
  try {
    return await pRetry(fn, { retries: 1, minTimeout: 200, factor: 2 });
  } catch (e) {
    console.error(`[searchEngine] source ${name} failed:`, e);
    if (hasRedis()) {
      await redis.set(KEY.breaker(name), "1", { ex: TTL.breaker });
    }
    return null;
  }
}

async function runSource(
  source: NewsSource,
  query: string,
  hoursBack: number
): Promise<readonly [string, RawNews[]]> {
  const items =
    (await withBreaker(source.id, () => source.fetch(query, hoursBack))) ?? [];
  return [source.id, items] as const;
}

export async function searchAll(query: string, hoursBack = 6): Promise<SearchResult> {
  const started = Date.now();
  const cacheKey = KEY.cache(query, hoursBack);
  if (hasRedis()) {
    const cached = await redis.get<SearchResult>(cacheKey);
    if (cached) return cached;
  }

  const sources = listAvailableSources();
  const skippedSources = NEWS_SOURCES.filter((s) => !s.isAvailable()).map((s) => s.id);

  const settled = await Promise.allSettled(
    sources.map((s) => runSource(s, query, hoursBack))
  );

  const perSource: Record<string, number> = {};
  const all: RawNews[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") {
      const [name, items] = r.value;
      perSource[name] = items.length;
      all.push(...items);
    }
  }

  const result: SearchResult = {
    items: dedupeNews(all),
    perSource,
    skippedSources,
    elapsedMs: Date.now() - started,
  };
  if (hasRedis()) {
    await redis.set(cacheKey, result, { ex: TTL.cache });
  }
  return result;
}
