import { answerCallback, sendMessage } from "../max";
import { getLastQuery, saveLastQuery } from "../services/lastQuery";
import { clearPending, setPending } from "../services/pending";
import { setUserPrefs } from "../services/userPrefs";
import type { BotContext } from "./context";
import {
  CB,
  cancelKeyboard,
  decodeQueryPayload,
  mainMenuKeyboard,
} from "./menu";
import * as commands from "./commands";

export interface CallbackContext extends BotContext {
  callbackId: string;
  payload: string;
}

export async function dispatchCallback(ctx: CallbackContext): Promise<void> {
  const { payload, callbackId } = ctx;

  try {
    await answerCallback(callbackId);
  } catch {
    /* уведомление необязательно */
  }

  if (payload === CB.CANCEL) {
    await clearPending(ctx.userId);
    return commands.sendHome(ctx);
  }

  if (payload === CB.HOME) {
    await clearPending(ctx.userId);
    return commands.sendHome(ctx);
  }

  if (payload === CB.SEARCH) {
    await setPending(ctx.userId, "search");
    await sendMessage({
      chatId: ctx.chatId,
      text:
        "🔍 *Поиск*\n\nНапишите ключевые слова или фразу — например:\n" +
        "_курс доллара_, _нейросети OpenAI_, _Спартак_",
      replyMarkup: cancelKeyboard(),
    });
    return;
  }

  if (payload === CB.SUB_ADD) {
    await setPending(ctx.userId, "subscribe");
    await sendMessage({
      chatId: ctx.chatId,
      text: "➕ *Новая подписка*\n\nНапишите тему для почасового мониторинга.",
      replyMarkup: cancelKeyboard(),
    });
    return;
  }

  if (payload === CB.SUBS) {
    await clearPending(ctx.userId);
    return commands.handleList(ctx);
  }

  if (payload === CB.SETTINGS) {
    await clearPending(ctx.userId);
    return commands.sendSettings(ctx);
  }

  if (payload === CB.SOURCES) {
    await clearPending(ctx.userId);
    return commands.handleSources(ctx);
  }

  if (payload === CB.HELP) {
    await clearPending(ctx.userId);
    return commands.handleHelp(ctx);
  }

  if (payload === CB.REFRESH) {
    const q = await getLastQuery(ctx.userId);
    if (!q) {
      await sendMessage({
        chatId: ctx.chatId,
        text: "Сначала выполните поиск — затем можно обновить дайджест.",
        replyMarkup: mainMenuKeyboard(),
      });
      return;
    }
    return commands.handleSearch(ctx, q);
  }

  if (payload === CB.SUB_LAST) {
    const q = await getLastQuery(ctx.userId);
    if (!q) {
      await sendMessage({
        chatId: ctx.chatId,
        text: "Нет последнего запроса. Сначала найдите новости по теме.",
        replyMarkup: mainMenuKeyboard(),
      });
      return;
    }
    return commands.handleSubscribe(ctx, q);
  }

  if (payload.startsWith("s:h:")) {
    const h = Number(payload.slice(4));
    if (h >= 1 && h <= 48) {
      await setUserPrefs(ctx.userId, { hoursBack: h });
      return commands.sendSettings(ctx, `✅ Глубина поиска: *${h}* ч.`);
    }
  }

  if (payload.startsWith("s:st:")) {
    const on = payload.endsWith(":1");
    await setUserPrefs(ctx.userId, { showSourceStats: on });
    return commands.sendSettings(ctx, `✅ Статистика источников: ${on ? "вкл" : "выкл"}.`);
  }

  if (payload.startsWith("a:q:")) {
    const q = decodeQueryPayload(payload.slice(4));
    if (q) {
      await saveLastQuery(ctx.userId, q);
      return commands.handleSearch(ctx, q);
    }
  }

  await sendMessage({
    chatId: ctx.chatId,
    text: "Кнопка устарела. Откройте меню ниже.",
    replyMarkup: mainMenuKeyboard(),
  });
  return;
}
