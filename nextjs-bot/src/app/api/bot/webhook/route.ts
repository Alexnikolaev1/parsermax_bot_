import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchCallback } from "@/lib/bot/callbacks";
import { dispatchMessage } from "@/lib/bot/router";
import { getConfig } from "@/lib/config";
import { markUpdateOnce } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TelegramUpdate = z.object({
  update_id: z.number(),
  message: z
    .object({
      message_id: z.number(),
      from: z.object({ id: z.number() }).optional(),
      chat: z.object({ id: z.number() }),
      text: z.string().optional(),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string(),
      from: z.object({ id: z.number() }),
      data: z.string().optional(),
      message: z
        .object({
          chat: z.object({ id: z.number() }),
        })
        .optional(),
    })
    .optional(),
});

function webhookAuthorized(req: NextRequest): boolean {
  const expected = getConfig().TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false;
  return req.headers.get("x-telegram-bot-api-secret-token") === expected;
}

export async function POST(req: NextRequest) {
  try {
    if (!webhookAuthorized(req)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new NextResponse("Bad JSON", { status: 400 });
    }

    const parsed = TelegramUpdate.safeParse(body);
    if (!parsed.success) {
      console.error("Invalid Telegram update", parsed.error);
      return NextResponse.json({ ok: true });
    }
    const upd = parsed.data;

    const fresh = await markUpdateOnce(upd.update_id);
    if (!fresh) return NextResponse.json({ ok: true, dedup: true });

    if (upd.callback_query) {
      const cq = upd.callback_query;
      const chatId = String(cq.message?.chat.id ?? cq.from.id);
      const userId = String(cq.from.id);
      const payload = cq.data ?? "";
      if (payload) {
        await dispatchCallback({
          userId,
          chatId,
          text: "",
          callbackId: cq.id,
          payload,
        });
      }
    } else if (upd.message?.text) {
      const msg = upd.message;
      const chatId = String(msg.chat.id);
      const userId = String(msg.from?.id ?? msg.chat.id);
      await dispatchMessage({
        userId,
        chatId,
        text: msg.text!.trim(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("webhook handler error:", e);
    return NextResponse.json({ ok: true });
  }
}
