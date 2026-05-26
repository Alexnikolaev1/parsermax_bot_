import { NextResponse } from "next/server";
import { hasLlm, hasRedis, getConfig } from "@/lib/config";
import { redis } from "@/lib/db";
import { listAvailableSources } from "@/lib/sources/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let redisOk = false;
  try {
    if (hasRedis()) {
      await redis.ping();
      redisOk = true;
    }
  } catch {
    /* */
  }

  const cfg = getConfig();
  const sources = listAvailableSources().map((s) => s.id);

  return NextResponse.json({
    ok: true,
    redis: redisOk,
    llm: hasLlm(),
    tgWorker: Boolean(cfg.TG_WORKER_URL && cfg.TG_WORKER_TOKEN),
    activeSources: sources,
    time: new Date().toISOString(),
  });
}
