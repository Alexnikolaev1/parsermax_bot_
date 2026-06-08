import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import {
  BOT_COMMANDS,
  getWebhookInfo,
  setMyCommands,
  setWebhook,
} from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Одноразовая настройка бота: webhook + меню команд.
 * GET /api/bot/setup?url=https://your-app.vercel.app/api/bot/webhook
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = getConfig().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const webhookUrl = new URL(req.url).searchParams.get("url");
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Pass ?url=https://your-host/api/bot/webhook" },
      { status: 400 }
    );
  }

  const tgSecret = getConfig().TELEGRAM_WEBHOOK_SECRET;
  if (!tgSecret) {
    return NextResponse.json({ error: "TELEGRAM_WEBHOOK_SECRET not set" }, { status: 500 });
  }

  await setWebhook(webhookUrl, tgSecret);
  await setMyCommands(BOT_COMMANDS);
  const info = await getWebhookInfo();

  return NextResponse.json({
    ok: true,
    webhookUrl,
    commands: BOT_COMMANDS.length,
    info,
  });
}
