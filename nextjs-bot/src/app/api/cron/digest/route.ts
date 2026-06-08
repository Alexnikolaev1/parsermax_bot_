import { NextRequest, NextResponse } from "next/server";
import { processWithAI } from "@/lib/aiProcessor";
import { redis, KEY, TTL } from "@/lib/db";
import { formatDigest } from "@/lib/formatter";
import { sendLongMessage } from "@/lib/telegram";
import { getConfig } from "@/lib/config";
import { searchAll } from "@/lib/searchEngine";
import { listAllSubscriptions } from "@/lib/services/subscriptions";
import type { RawNews } from "@/lib/types";
import { sha256 } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const want = process.env.CRON_SECRET;
  if (!want) return false;
  return req.headers.get("authorization") === `Bearer ${want}`;
}

async function filterUnseen(userId: string, items: RawNews[]): Promise<RawNews[]> {
  const fresh: RawNews[] = [];
  for (const it of items) {
    const h = sha256(it.id);
    const ok = await redis.set(KEY.seen(userId, h), "1", { nx: true, ex: TTL.seen });
    if (ok === "OK") fresh.push(it);
  }
  return fresh;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const subs = await listAllSubscriptions();
  let sent = 0;
  const maxChars = getConfig().TELEGRAM_MESSAGE_CHARS;

  for (const sub of subs) {
    try {
      const search = await searchAll(sub.query, 1);
      const fresh = await filterUnseen(sub.userId, search.items);
      if (!fresh.length) continue;

      const digest = await processWithAI(sub.query, fresh);
      if (!digest.clusters.length) continue;

      const text = formatDigest(sub.query, fresh, digest);
      await sendLongMessage({ chatId: sub.chatId, text, maxChars });
      sent++;
    } catch (e) {
      console.error(`digest failed for ${sub.userId}/${sub.query}:`, e);
    }
  }

  return NextResponse.json({
    ok: true,
    subscriptions: subs.length,
    sent,
  });
}
