import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchMessage } from "@/lib/bot/router";
import { markUpdateOnce } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MaxUpdate = z.object({
  update_type: z.string().optional(),
  update_id: z.union([z.string(), z.number()]).optional(),
  message: z
    .object({
      sender: z.object({ user_id: z.union([z.string(), z.number()]) }).optional(),
      recipient: z.object({ chat_id: z.union([z.string(), z.number()]).optional() }).optional(),
      body: z.object({ text: z.string().optional() }).optional(),
      timestamp: z.number().optional(),
    })
    .optional(),
  callback: z
    .object({
      callback_id: z.string(),
      payload: z.string().optional(),
      user: z.object({ user_id: z.union([z.string(), z.number()]) }).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.MAX_WEBHOOK_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const parsed = MaxUpdate.safeParse(body);
  if (!parsed.success) {
    console.error("Invalid MAX update", parsed.error);
    return NextResponse.json({ ok: true });
  }
  const upd = parsed.data;

  if (upd.update_id != null) {
    const fresh = await markUpdateOnce(upd.update_id);
    if (!fresh) return NextResponse.json({ ok: true, dedup: true });
  }

  try {
    if (upd.message) {
      const msg = upd.message;
      const text = msg.body?.text?.trim() ?? "";
      const chatId = String(msg.recipient?.chat_id ?? msg.sender?.user_id ?? "");
      const userId = String(msg.sender?.user_id ?? chatId);
      if (chatId) {
        await dispatchMessage({ userId, chatId, text });
      }
    }
  } catch (e) {
    console.error("webhook handler error:", e);
  }

  return NextResponse.json({ ok: true });
}
