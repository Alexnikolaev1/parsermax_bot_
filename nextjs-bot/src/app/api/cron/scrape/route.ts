import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/lib/searchEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Тяжёлый прогрев кеша / ранний скрап. По умолчанию выключен в vercel.json
 * (5-минутный интервал требует Pro). Может вызываться вручную или внешним
 * cron-сервисом.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const queries = (process.env.WARMUP_QUERIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const results = await Promise.allSettled(queries.map((q) => searchAll(q, 1)));
  return NextResponse.json({
    queries: queries.length,
    ok: results.filter((r) => r.status === "fulfilled").length,
  });
}
