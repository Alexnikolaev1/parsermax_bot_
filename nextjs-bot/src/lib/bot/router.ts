import { parseCommandArgs } from "../core/query";
import type { BotContext } from "./context";
import * as commands from "./commands";

type Handler = (ctx: BotContext, args: string) => Promise<void>;

const COMMAND_MAP: Record<string, Handler> = {
  start: commands.handleStart,
  help: commands.handleHelp,
  search: (ctx, args) => commands.handleSearch(ctx, args),
  subscribe: (ctx, args) => commands.handleSubscribe(ctx, args),
  unsubscribe: (ctx, args) => commands.handleUnsubscribe(ctx, args),
  list: (ctx) => commands.handleList(ctx),
  settings: (ctx, args) => commands.handleSettings(ctx, args),
  sources: commands.handleSources,
};

/** Минимальная длина свободного текстового запроса (без /). */
const FREE_TEXT_MIN = 2;

export async function dispatchMessage(ctx: BotContext): Promise<void> {
  const text = ctx.text.trim();
  if (!text) {
    return commands.handleStart(ctx);
  }

  const parsed = parseCommandArgs(text);
  if (parsed) {
    const handler = COMMAND_MAP[parsed.cmd];
    if (handler) {
      return handler(ctx, parsed.args);
    }
    return commands.handleUnknown(ctx);
  }

  if (text.length >= FREE_TEXT_MIN) {
    return commands.handleSearch(ctx, text);
  }

  return commands.handleUnknown(ctx);
}
