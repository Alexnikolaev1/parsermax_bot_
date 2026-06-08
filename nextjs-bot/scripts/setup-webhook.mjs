#!/usr/bin/env node
/**
 * Регистрация Telegram webhook + меню команд.
 * Не требует деплоя — вызывает api.telegram.org напрямую.
 *
 * Использование:
 *   node scripts/setup-webhook.mjs --url https://your-host/api/bot/webhook
 *
 * Читает TELEGRAM_BOT_TOKEN и TELEGRAM_WEBHOOK_SECRET из .env.local / .env
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(name) {
  const path = resolve(root, name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const args = process.argv.slice(2);
const urlIdx = args.indexOf("--url");
const webhookUrl =
  (urlIdx >= 0 ? args[urlIdx + 1] : null) ||
  process.env.WEBHOOK_PUBLIC_URL ||
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}/api/bot/webhook`;

let token = process.env.TELEGRAM_BOT_TOKEN?.trim().replace(/^["']|["']$/g, "");
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim().replace(/^["']|["']$/g, "");

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN не найден. Создайте nextjs-bot/.env");
  process.exit(1);
}
if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) {
  console.error("❌ TELEGRAM_BOT_TOKEN неверного формата.");
  console.error("   Должен быть как от @BotFather: 7123456789:AAHxxxx…");
  console.error("   Запустите: npm run check:token");
  process.exit(1);
}
if (!secret) {
  console.error("❌ TELEGRAM_WEBHOOK_SECRET не найден в .env.local");
  process.exit(1);
}
if (!webhookUrl) {
  console.error("❌ Укажите URL: --url https://<host>/api/bot/webhook");
  process.exit(1);
}

const COMMANDS = [
  { command: "start", description: "Главное меню" },
  { command: "menu", description: "Открыть меню" },
  { command: "search", description: "AI-поиск по теме" },
  { command: "subscribe", description: "Подписка на мониторинг" },
  { command: "list", description: "Мои подписки" },
  { command: "settings", description: "Настройки поиска" },
  { command: "sources", description: "Статус источников" },
  { command: "help", description: "Справка" },
];

async function tg(method, body, attempt = 1) {
  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    if (attempt < 3) {
      console.warn(`⚠️ ${method} попытка ${attempt} не удалась, повтор…`);
      await new Promise((r) => setTimeout(r, 2000));
      return tg(method, body, attempt + 1);
    }
    throw e;
  }
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`${method}: ${data.description ?? res.statusText}`);
  }
  return data.result;
}

console.log("🔗 Webhook URL:", webhookUrl);

await tg("setWebhook", {
  url: webhookUrl,
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
});
console.log("✅ setWebhook OK");

await tg("setMyCommands", { commands: COMMANDS });
console.log(`✅ setMyCommands OK (${COMMANDS.length} команд)`);

const info = await tg("getWebhookInfo", {});
console.log("\n📋 getWebhookInfo:");
console.log(JSON.stringify(info, null, 2));
