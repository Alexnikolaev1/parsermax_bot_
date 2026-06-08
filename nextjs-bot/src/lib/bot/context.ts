/** Контекст одного входящего сообщения Telegram. */
export interface BotContext {
  userId: string;
  chatId: string;
  text: string;
}
