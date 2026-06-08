import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = resolve(root, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^TELEGRAM_BOT_TOKEN=(.*)$/);
    if (!m) continue;
    const t = m[1].trim().replace(/^["']|["']$/g, "");
    const ok = /^\d+:[A-Za-z0-9_-]{30,}$/.test(t);
    console.log(`Файл: ${f}`);
    console.log(`Длина токена: ${t.length}`);
    console.log(`Формат BotFather (123456:ABC…): ${ok ? "✅" : "❌"}`);
    if (!ok) {
      console.log("\nИсправьте TELEGRAM_BOT_TOKEN в .env:");
      console.log("  • Скопируйте токен из @BotFather без кавычек и пробелов");
      console.log("  • Должен быть вида: 7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
      process.exit(1);
    }
    const res = await fetch(`https://api.telegram.org/bot${t}/getMe`, {
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`getMe: ✅ @${data.result.username} (${data.result.first_name})`);
      process.exit(0);
    }
    console.log(`getMe: ❌ ${data.description}`);
    process.exit(1);
  }
}
console.error("TELEGRAM_BOT_TOKEN не найден в .env");
process.exit(1);
