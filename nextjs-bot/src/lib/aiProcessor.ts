import { getConfig, llmApiKey } from "./config";
import type { AIDigest, RawNews } from "./types";

/**
 * Один вызов LLM с tool-calling для надёжного structured output.
 * Модель сама фильтрует нерелевантные новости, пишет краткое резюме,
 * категорию, sentiment и кластеризует одинаковые сюжеты.
 */
export async function processWithAI(query: string, items: RawNews[]): Promise<AIDigest> {
  if (!items.length) return { clusters: [], filtered: 0 };
  const key = llmApiKey();
  if (!key) {
    // Без LLM — graceful fallback: один кластер на каждую новость.
    return {
      clusters: items.slice(0, 15).map((_, i) => ({
        summary: items[i].title,
        category: "новости",
        sentiment: "neutral",
        itemIndices: [i],
      })),
      filtered: 0,
    };
  }

  const compact = items.map((it, i) => ({
    i,
    title: it.title,
    snippet: it.snippet.slice(0, 200),
    source: it.source,
    kind: it.kind,
    time: it.publishedAt,
  }));

  const system =
    "Ты — главный редактор новостной ленты. Получаешь сырой список новостей и запрос пользователя. " +
    "Твоя задача:\n" +
    "1) Отфильтруй нерелевантные пункты (контекст важнее буквального совпадения).\n" +
    "2) Сгруппируй пункты, описывающие один и тот же сюжет, в кластеры.\n" +
    "3) Для каждого кластера дай: summary (1–2 предложения, по-русски, информативно), " +
    "category (политика/экономика/технологии/спорт/происшествия/наука/общество/культура), " +
    "sentiment (positive|neutral|negative), и itemIndices — индексы исходных пунктов в кластере.\n" +
    "Не выдумывай факты. Используй только данные из заголовков и сниппетов.";

  const user = `Запрос пользователя: "${query}".\n\nСырые новости:\n${JSON.stringify(compact)}`;

  const cfg = getConfig();
  const body = {
    model: cfg.LLM_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "emit_digest",
          description: "Вернуть структурированный дайджест.",
          parameters: {
            type: "object",
            properties: {
              clusters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    category: { type: "string" },
                    sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                    itemIndices: { type: "array", items: { type: "integer" } },
                  },
                  required: ["summary", "category", "sentiment", "itemIndices"],
                  additionalProperties: false,
                },
              },
              filtered: { type: "integer" },
            },
            required: ["clusters", "filtered"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "emit_digest" } },
  };

  const res = await fetch(`${cfg.LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 429) throw new Error("LLM rate limit (429). Попробуйте через минуту.");
  if (res.status === 402) throw new Error("LLM credits exhausted (402). Пополните баланс Lovable AI.");
  if (!res.ok) throw new Error(`LLM error ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as LlmResponse;
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  const args = call?.function?.arguments;
  if (!args) throw new Error("LLM returned no tool call");

  const parsed = JSON.parse(args) as AIDigest;
  // Защита от мусорных индексов
  parsed.clusters = parsed.clusters
    .map((c) => ({
      ...c,
      itemIndices: c.itemIndices.filter((i) => i >= 0 && i < items.length),
    }))
    .filter((c) => c.itemIndices.length > 0);
  return parsed;
}

interface LlmResponse {
  choices?: Array<{
    message?: {
      tool_calls?: Array<{
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
}
