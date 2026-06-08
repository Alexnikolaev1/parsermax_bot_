import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = resolve(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()])
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const emptyToUndef = (v) =>
  v === "" || v === undefined || v === null ? undefined : v;

const EnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  TELEGRAM_WEBHOOK_SECRET: z.preprocess(emptyToUndef, z.string().min(8).optional()),
  UPSTASH_REDIS_REST_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: z.preprocess(emptyToUndef, z.string().min(1).optional()),
  LOVABLE_API_KEY: z.preprocess(emptyToUndef, z.string().optional()),
  OPENAI_API_KEY: z.preprocess(emptyToUndef, z.string().optional()),
  LLM_BASE_URL: z.preprocess(
    emptyToUndef,
    z.string().url().default("https://ai.gateway.lovable.dev/v1"),
  ),
  LLM_MODEL: z.preprocess(emptyToUndef, z.string().default("google/gemini-3-flash-preview")),
  TG_WORKER_URL: z.preprocess(emptyToUndef, z.string().url().optional()),
  TG_WORKER_TOKEN: z.preprocess(emptyToUndef, z.string().optional()),
  CRON_SECRET: z.preprocess(emptyToUndef, z.string().optional()),
  INSTANT_API_SECRET: z.preprocess(emptyToUndef, z.string().optional()),
  WARMUP_QUERIES: z.preprocess(emptyToUndef, z.string().optional()),
  TELEGRAM_MESSAGE_CHARS: z.coerce.number().int().min(500).max(4096).default(4000),
  DEFAULT_HOURS_BACK: z.coerce.number().int().min(1).max(48).default(6),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).max(60).default(10),
});

const r = EnvSchema.safeParse(process.env);
if (!r.success) {
  console.log("CONFIG_FAIL");
  for (const i of r.error.issues) console.log(`${i.path.join(".")}: ${i.message}`);
  process.exit(1);
}
console.log("CONFIG_OK");
console.log("hasRedis:", !!(r.data.UPSTASH_REDIS_REST_URL && r.data.UPSTASH_REDIS_REST_TOKEN));
console.log("hasLlm:", !!(r.data.LOVABLE_API_KEY || r.data.OPENAI_API_KEY));
console.log("hasWebhookSecret:", !!r.data.TELEGRAM_WEBHOOK_SECRET);
