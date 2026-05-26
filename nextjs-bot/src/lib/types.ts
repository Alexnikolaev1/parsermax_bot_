/** Базовые типы предметной области. */

export type SourceKind =
  | "googlenews"
  | "rss"
  | "reddit"
  | "hackernews"
  | "telegram"
  | "telegram_web"
  | "youtube";

export interface RawNews {
  /** Стабильный ID для дедупа (нормализованный URL). */
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;          // "Reuters", "Lenta.ru", "@meduzalive" ...
  kind: SourceKind;
  /** ISO-8601 в UTC. */
  publishedAt: string;
  lang?: string;
}

export type Sentiment = "positive" | "neutral" | "negative";

export interface AICluster {
  /** Объединённое краткое содержание сюжета (1–2 предложения, RU). */
  summary: string;
  category: string;        // "политика", "технологии" и т.д.
  sentiment: Sentiment;
  /** Индексы из исходного массива RawNews, входящие в кластер. */
  itemIndices: number[];
}

export interface AIDigest {
  clusters: AICluster[];
  /** Сколько пунктов было отсеяно как нерелевантные. */
  filtered: number;
}

export interface Subscription {
  userId: string;
  chatId: string;
  query: string;
  createdAt: string;
}

/** Настройки пользователя (Redis). */
export interface UserPrefs {
  hoursBack: number;
  /** Показывать статистику по источникам в конце дайджеста. */
  showSourceStats: boolean;
}
