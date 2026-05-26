import { fetchGoogleNews } from "./googleNewsRss";
import type { RawNews } from "../types";

/**
 * YouTube без официального API: используем Google News с фильтром
 * site:youtube.com, чтобы не платить за YouTube Data API.
 * Когда добавите YOUTUBE_API_KEY — переключитесь на youtubeApi.ts.disabled.
 */
export async function fetchYouTube(query: string): Promise<RawNews[]> {
  const items = await fetchGoogleNews(`${query} site:youtube.com`);
  return items.map((it) => ({ ...it, kind: "youtube", source: it.source || "YouTube" }));
}
