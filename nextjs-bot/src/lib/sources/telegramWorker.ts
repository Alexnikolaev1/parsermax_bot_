import type { RawNews } from "../types";

/**
 * Полнотекстовый поиск по публичным Telegram-каналам через Python
 * tg-worker (FastAPI + Telethon). Telethon не работает в serverless —
 * поэтому мы общаемся с воркером по HTTP.
 */
export async function fetchTelegramViaWorker(query: string, hoursBack = 6): Promise<RawNews[]> {
  const base = process.env.TG_WORKER_URL;
  const token = process.env.TG_WORKER_TOKEN;
  if (!base || !token) return [];

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "MAXNewsBot/1.0",
      },
      body: JSON.stringify({ q: query, hours: hoursBack, limit: 30 }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) {
      console.error("tg-worker error:", res.status, await res.text());
      return [];
    }
    const data = (await res.json()) as { items: TgItem[] };
    return data.items.map((m): RawNews => ({
      id: m.url,
      title: (m.text ?? "").slice(0, 120),
      snippet: (m.text ?? "").slice(0, 400),
      url: m.url,
      source: m.channel,
      kind: "telegram",
      publishedAt: m.date,
    }));
  } catch (e) {
    console.error("tg-worker fetch failed:", e);
    return [];
  }
}

interface TgItem {
  channel: string;
  url: string;
  text: string;
  date: string;
}
