import type { RawNews, SourceKind } from "../types";

export interface NewsSource {
  /** Уникальный id для circuit breaker и статистики. */
  id: string;
  kind: SourceKind;
  label: string;
  emoji: string;
  /** Таймаут одного запроса к источнику, мс. */
  timeoutMs: number;
  /** false — источник пропускается (нет env и т.д.). */
  isAvailable: () => boolean;
  fetch: (query: string, hoursBack: number) => Promise<RawNews[]>;
}
