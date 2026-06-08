import Parser from "rss-parser";
import pLimit from "p-limit";
import type { RawNews } from "../types";
import { matchesQuery, normalizeUrl } from "../utils";

/** ~50 русскоязычных и мировых СМИ. Дополняйте по вкусу. */
export const RSS_FEEDS: { url: string; source: string }[] = [
  // Российские
  { url: "https://lenta.ru/rss/news", source: "Lenta.ru" },
  { url: "https://www.rbc.ru/v10/ajax/rssnews", source: "РБК" },
  { url: "https://www.kommersant.ru/RSS/news.xml", source: "Коммерсантъ" },
  { url: "https://www.vedomosti.ru/rss/news", source: "Ведомости" },
  { url: "https://tass.ru/rss/v2.xml", source: "ТАСС" },
  { url: "https://ria.ru/export/rss2/archive/index.xml", source: "РИА Новости" },
  { url: "https://www.gazeta.ru/export/rss/lenta.xml", source: "Газета.Ru" },
  { url: "https://www.interfax.ru/rss.asp", source: "Интерфакс" },
  { url: "https://www.kp.ru/rss/allsections.xml", source: "КП" },
  { url: "https://russian.rt.com/rss", source: "RT на русском" },
  { url: "https://meduza.io/rss/all", source: "Meduza" },
  { url: "https://www.novayagazeta.ru/rss/all.xml", source: "Новая газета" },
  { url: "https://www.fontanka.ru/fontanka.rss", source: "Фонтанка" },
  { url: "https://www.mk.ru/rss/index.xml", source: "МК" },
  { url: "https://iz.ru/xml/rss/all.xml", source: "Известия" },
  { url: "https://www.bfm.ru/news.rss?rubric=19", source: "BFM" },
  { url: "https://www.forbes.ru/newrss.xml", source: "Forbes Russia" },
  { url: "https://habr.com/ru/rss/news/", source: "Хабр" },
  { url: "https://3dnews.ru/news/rss/", source: "3DNews" },
  { url: "https://vc.ru/rss", source: "VC.ru" },
  // Мировые англоязычные
  { url: "http://feeds.bbci.co.uk/news/rss.xml", source: "BBC" },
  { url: "https://feeds.reuters.com/reuters/topNews", source: "Reuters" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
  { url: "https://rss.cnn.com/rss/edition.rss", source: "CNN" },
  { url: "https://feeds.npr.org/1001/rss.xml", source: "NPR" },
  { url: "https://www.theguardian.com/world/rss", source: "Guardian" },
  { url: "https://feeds.washingtonpost.com/rss/world", source: "Washington Post" },
  { url: "https://www.ft.com/rss/home", source: "Financial Times" },
  { url: "https://www.economist.com/the-world-this-week/rss.xml", source: "Economist" },
  { url: "https://feeds.bloomberg.com/markets/news.rss", source: "Bloomberg" },
  { url: "https://www.wsj.com/xml/rss/3_7085.xml", source: "WSJ" },
  { url: "https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/world/rss.xml", source: "NYT" },
  { url: "https://www.spiegel.de/international/index.rss", source: "Spiegel Intl" },
  { url: "https://www.lemonde.fr/en/rss/une.xml", source: "Le Monde" },
  { url: "https://feeds.dw.com/rdf/rss-en-all", source: "DW" },
  // Tech/business
  { url: "https://techcrunch.com/feed/", source: "TechCrunch" },
  { url: "https://www.theverge.com/rss/index.xml", source: "The Verge" },
  { url: "https://arstechnica.com/feed/", source: "Ars Technica" },
  { url: "https://www.wired.com/feed/rss", source: "Wired" },
  { url: "https://hnrss.org/frontpage", source: "Hacker News" },
  { url: "https://www.engadget.com/rss.xml", source: "Engadget" },
  { url: "https://www.cnet.com/rss/news/", source: "CNET" },
  { url: "https://feeds.feedburner.com/venturebeat/SZYF", source: "VentureBeat" },
  { url: "https://www.zdnet.com/news/rss.xml", source: "ZDNet" },
  { url: "https://feeds.feedburner.com/Mashable", source: "Mashable" },
  // Спорт/lifestyle
  { url: "https://www.sports.ru/rss/main.xml", source: "Sports.ru" },
  { url: "https://www.championat.com/rss/news/", source: "Чемпионат" },
  // Дополнительные
  { url: "https://nplus1.ru/rss", source: "N+1" },
  { url: "https://naked-science.ru/?feed=rss2", source: "Naked Science" },
];

const parser = new Parser({
  timeout: 3000,
  headers: { "User-Agent": "TelegramNewsBot/1.0 (+news monitor)" },
});

/** Параллельно качает все RSS, фильтрует по запросу, нормализует. */
export async function fetchRssFeeds(query: string, hoursBack = 6): Promise<RawNews[]> {
  const limit = pLimit(8); // не больше 8 параллельных HTTP
  const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
  const tasks = RSS_FEEDS.map((feed) =>
    limit(async () => {
      try {
        const f = await parser.parseURL(feed.url);
        return f.items
          .filter((it) => {
            const text = `${it.title ?? ""} ${it.contentSnippet ?? ""}`;
            if (!matchesQuery(text, query)) return false;
            const t = new Date(it.isoDate ?? it.pubDate ?? 0).getTime();
            return t >= cutoff;
          })
          .map((it): RawNews => ({
            id: normalizeUrl(it.link ?? ""),
            title: (it.title ?? "").trim(),
            snippet: (it.contentSnippet ?? "").trim().slice(0, 300),
            url: it.link ?? "",
            source: feed.source,
            kind: "rss",
            publishedAt: new Date(it.isoDate ?? it.pubDate ?? Date.now()).toISOString(),
          }));
      } catch {
        return [];
      }
    })
  );

  const results = await Promise.allSettled(tasks);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
