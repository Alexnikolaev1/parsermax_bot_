import crypto from "node:crypto";

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[«»"'`„“]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    [...u.searchParams.keys()].forEach((k) => {
      if (/^utm_|^fbclid$|^gclid$|^yclid$/i.test(k)) u.searchParams.delete(k);
    });
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** AND-поиск по токенам — лучше для многословных запросов, чем substring целиком. */
export function matchesQuery(text: string, query: string): boolean {
  const hay = text.toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^["«]|["»]$/g, ""))
    .filter((t) => t.length >= 2);
  if (!tokens.length) return hay.includes(query.toLowerCase());
  return tokens.every((t) => hay.includes(t));
}

/** Ограничение параллелизма без p-limit (несовместим с webpack в Next 14). */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 5000, ...rest } = init;
  return fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
}

/** Разбивает длинный markdown-текст на части для последовательной отправки. */
export function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf("\n\n", maxLen);
    if (cut < maxLen * 0.4) cut = rest.lastIndexOf("\n", maxLen);
    if (cut < maxLen * 0.3) cut = maxLen;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}
