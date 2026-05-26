import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchCallback } from "@/lib/bot/callbacks";
import { dispatchMessage } from "@/lib/bot/router";
import * as commands from "@/lib/bot/commands";
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
      message: z
        .object({
          recipient: z.object({ chat_id: z.union([z.string(), z.number()]).optional() }).optional(),
        })
        .optional(),
    })
    .optional(),
});

function chatIdFromMessage(
  msg: NonNullable<z.infer<typeof MaxUpdate>["message"]>
): { chatId: string; userId: string } | null {
  const chatId = String(msg.recipient?.chat_id ?? msg.sender?.user_id ?? "");
  const userId = String(msg.sender?.user_id ?? chatId);
  if (!chatId) return null;
  return { chatId, userId };
}

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
    if (upd.update_type === "bot_started") {
      const uid = upd.message?.sender?.user_id;
      const ids = upd.message ? chatIdFromMessage(upd.message) : null;
      if (ids) await commands.handleStart({ ...ids, text: "" });
      else if (uid)
        await commands.handleStart({ userId: String(uid), chatId: String(uid), text: "" });
      return NextResponse.json({ ok: true });
    }

    if (upd.callback?.callback_id) {
      const cb = upd.callback;
      const userId = String(cb.user?.user_id ?? "");
      const chatId = String(
        cb.message?.recipient?.chat_id ?? cb.user?.user_id ?? ""
      );
      const payload = cb.payload ?? "";
      if (chatId && payload) {
        await dispatchCallback({
          userId: userId || chatId,
          chatId,
          text: "",
          callbackId: cb.callback_id,
          payload,
        });
      }
    } else if (upd.message) {
      const ids = chatIdFromMessage(upd.message);
      if (ids) {
        const text = upd.message.body?.text?.trim() ?? "";
        await dispatchMessage({ ...ids, text });
      }
    }
  } catch (e) {
    console.error("webhook handler error:", e);
  }

  return NextResponse.json({ ok: true });
}
