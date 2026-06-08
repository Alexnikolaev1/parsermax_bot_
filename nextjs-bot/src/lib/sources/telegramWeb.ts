import * as cheerio from "cheerio";
import type { RawNews } from "../types";
import { matchesQuery } from "../utils";

/**
 * Backup-источник для Telegram: парсинг публичной web-превью страницы
 * `https://t.me/s/<channel>` для заранее известного списка каналов.
 *
 * ВАЖНО: это запасной вариант. Основной полнотекстовый поиск делает
 * Python tg-worker через Telethon (см. telegramWorker.ts).
 * Здесь мы лишь забираем последние посты и фильтруем локально.
 */
const CHANNELS = [
  "rian_ru", "tass_agency", "rbc_news", "bbcrussian", "meduzalive",
  "varlamov_news", "rtnews", "interfaxonline", "lentachold", "kommersant",
];

export async function fetchTelegramWeb(query: string, hoursBack = 6): Promise<RawNews[]> {
  const cutoff = Date.now() - hoursBack * 3600 * 1000;

  const tasks = CHANNELS.map(async (channel) => {
    try {
      const res = await fetch(`https://t.me/s/${channel}`, {
        headers: { "User-Agent": "TelegramNewsBot/1.0" },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return [] as RawNews[];
      const html = await res.text();
      const $ = cheerio.load(html);
      const posts: RawNews[] = [];

      $(".tgme_widget_message").each((_, el) => {
        const $el = $(el);
        const text = $el.find(".tgme_widget_message_text").text().trim();
        if (!text || !matchesQuery(text, query)) return;
        const dateAttr = $el.find("time").attr("datetime");
        const ts = dateAttr ? new Date(dateAttr).getTime() : 0;
        if (ts < cutoff) return;
        const link = $el.attr("data-post");
        if (!link) return;
        posts.push({
          id: `https://t.me/${link}`,
          title: text.slice(0, 120),
          snippet: text.slice(0, 400),
          url: `https://t.me/${link}`,
          source: `@${channel}`,
          kind: "telegram_web",
          publishedAt: new Date(ts).toISOString(),
        });
      });
      return posts;
    } catch {
      return [];
    }
  });

  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
