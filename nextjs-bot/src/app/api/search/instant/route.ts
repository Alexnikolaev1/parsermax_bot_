import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getConfig } from "@/lib/config";
import { buildDigestText } from "@/lib/services/searchPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().min(2).max(200),
  hours: z.coerce.number().int().min(1).max(48).optional(),
  stats: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v !== "0" && v !== "false"),
});

function authorized(req: NextRequest): boolean {
  const secret = getConfig().INSTANT_API_SECRET || getConfig().CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { q, hours = getConfig().DEFAULT_HOURS_BACK } = parsed.data;

  try {
    const { search, digest, text } = await buildDigestText(q, hours);
    return NextResponse.json({
      query: q,
      hours,
      perSource: search.perSource,
      skippedSources: search.skippedSources,
      elapsedMs: search.elapsedMs,
      totalItems: search.items.length,
      digest,
      rendered: text,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
