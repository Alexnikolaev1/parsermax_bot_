import levenshtein from "js-levenshtein";
import type { RawNews } from "../types";
import { normalizeTitle, sha256 } from "../utils";

const FUZZY_THRESHOLD = 0.85;
const MAX_ITEMS = 60;

/**
 * Трёхуровневый дедуп:
 * 1. По нормализованному URL (RawNews.id).
 * 2. По SHA-256 от очищенного заголовка.
 * 3. Нечёткое сравнение Левенштейном.
 */
export function dedupeNews(items: RawNews[], maxItems = MAX_ITEMS): RawNews[] {
  const byId = new Map<string, RawNews>();
  for (const it of items) {
    if (!byId.has(it.id)) byId.set(it.id, it);
  }
  const stage1 = [...byId.values()];

  const byTitleHash = new Map<string, RawNews>();
  for (const it of stage1) {
    const h = sha256(normalizeTitle(it.title));
    if (!byTitleHash.has(h)) byTitleHash.set(h, it);
  }
  const stage2 = [...byTitleHash.values()];

  const out: RawNews[] = [];
  for (const it of stage2) {
    const norm = normalizeTitle(it.title);
    const dup = out.find((other) => {
      const o = normalizeTitle(other.title);
      const maxLen = Math.max(norm.length, o.length) || 1;
      const sim = 1 - levenshtein(norm, o) / maxLen;
      return sim >= FUZZY_THRESHOLD;
    });
    if (!dup) out.push(it);
  }

  out.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  return out.slice(0, maxItems);
}
