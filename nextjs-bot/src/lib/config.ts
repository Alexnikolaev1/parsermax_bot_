/**
 * Типизированная конфигурация из process.env.
 * В serverless нет единой точки старта — читаем лениво при первом обращении.
 */
import { z } from "zod";

const EnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(8).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  LOVABLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().url().default("https://ai.gateway.lovable.dev/v1"),
  LLM_MODEL: z.string().default("google/gemini-3-flash-preview"),
  TG_WORKER_URL: z.string().url().optional(),
  TG_WORKER_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  INSTANT_API_SECRET: z.string().optional(),
  WARMUP_QUERIES: z.string().optional(),
  /** Макс. символов в одном сообщении Telegram (лимит API 4096). */
  TELEGRAM_MESSAGE_CHARS: z.coerce.number().int().min(500).max(4096).default(4000),
  DEFAULT_HOURS_BACK: z.coerce.number().int().min(1).max(48).default(6),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).max(60).default(10),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) cached = EnvSchema.parse(process.env);
  return cached;
}

export function hasLlm(): boolean {
  const c = getConfig();
  return Boolean(c.LOVABLE_API_KEY || c.OPENAI_API_KEY);
}

export function hasRedis(): boolean {
  const c = getConfig();
  return Boolean(c.UPSTASH_REDIS_REST_URL && c.UPSTASH_REDIS_REST_TOKEN);
}

export function llmApiKey(): string {
  const c = getConfig();
  return c.LOVABLE_API_KEY || c.OPENAI_API_KEY || "";
}
