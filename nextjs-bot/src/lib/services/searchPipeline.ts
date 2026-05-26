import { getConfig } from "../config";
import { processWithAI } from "../aiProcessor";
import { formatDigest, formatSourceStats, formatSearchFallback } from "../formatter";
import { editMessage, sendLongMessage } from "../max";
import { searchAll, type SearchResult } from "../searchEngine";
import type { AIDigest, RawNews } from "../types";

export interface PipelineOptions {
  chatId: string;
  query: string;
  hoursBack: number;
  showSourceStats?: boolean;
  /** ID статус-сообщения для редактирования (webhook flow). */
  statusMessageId?: string | number;
}

export interface PipelineResult {
  search: SearchResult;
  digest: AIDigest;
  texts: string[];
}

export async function runSearchPipeline(opts: PipelineOptions): Promise<PipelineResult> {
  const { chatId, query, hoursBack, showSourceStats = true, statusMessageId } = opts;

  const search = await searchAll(query, hoursBack);

  if (statusMessageId) {
    try {
      await editMessage(
        statusMessageId,
        `🧠 AI анализирует ${search.items.length} материалов…`
      );
    } catch {
      /* edit может быть недоступен */
    }
  }

  let digest: AIDigest;
  let body: string;
  try {
    digest = await processWithAI(query, search.items);
    body = formatDigest(query, search.items, digest);
    if (showSourceStats) {
      body += "\n\n" + formatSourceStats(search);
    }
  } catch (e) {
    console.error("AI pipeline failed:", e);
    digest = { clusters: [], filtered: 0 };
    body = formatSearchFallback(query, search, (e as Error).message);
  }

  const maxChars = getConfig().MAX_MESSAGE_CHARS;
  const texts = await sendLongMessage({ chatId, text: body, maxChars });

  return { search, digest, texts };
}

/** Только поиск + AI без отправки в MAX (для API/cron). */
export async function buildDigestText(
  query: string,
  hoursBack: number,
  items?: RawNews[]
): Promise<{ search: SearchResult; digest: AIDigest; text: string }> {
  const search = items
    ? { items, perSource: {}, skippedSources: [], elapsedMs: 0 }
    : await searchAll(query, hoursBack);

  let digest: AIDigest;
  let text: string;
  try {
    digest = await processWithAI(query, search.items);
    text = formatDigest(query, search.items, digest) + "\n\n" + formatSourceStats(search);
  } catch (e) {
    digest = { clusters: [], filtered: 0 };
    text = formatSearchFallback(query, search, (e as Error).message);
  }
  return { search, digest, text };
}
